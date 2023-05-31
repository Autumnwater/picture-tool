import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import Store from 'electron-store'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import creatWorker from './worker?nodeWorker'
import callFork from './fork'
import storeCall from './store'
import { spawn } from 'child_process'
import moment from 'moment'
import {
  existsSync,
  statSync,
  createReadStream,
  createWriteStream,
  readdirSync,
  unlinkSync,
  rmdirSync,
  mkdir,
  readdir,
  cp
} from 'fs'

let mainWindow
const store = new Store()

console.log('process.platform', process.platform)
// mac版本
let pythonChildProcessPath = '/Users/admin/project/py/py_scripts'
let pythonPath = '/Users/admin/opt/anaconda3/bin/python'

if (process.platform === 'darwin') {
  pythonChildProcessPath = '/Users/admin/project/py/py_scripts'
  pythonPath = '/Users/admin/opt/anaconda3/bin/python'
} else if (process.platform === 'win32') {
  pythonChildProcessPath = 'D:/fluorescence/py_scripts'
  pythonPath =
    'C:/Users/Administrator.DESKTOP-4KDI50A/AppData/Local/Microsoft/WindowsApps/python.exe'
} else {
  console.log('啥都不是')
}
// win版本

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 890,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux'
      ? {
          icon: path.join(__dirname, '../../build/icon.png')
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  // 设置默认输出目录
  if (!store.get('filePath')) {
    store.set('filePath', path.join(__dirname, pythonChildProcessPath))
  }

  // 处理下之前的图片文件
  const filePath = `${pythonChildProcessPath}/images/`
  if (filePath) {
    readdir(filePath, (err, files) => {
      if (err) {
        throw err
      }
      // files object contains all files names
      // 如果不删除
      const picList: VideoFile[] = []
      const videoType = getVideoExtensions()
      files.forEach((file) => {
        /*只获取后缀*/
        var suffix = file.substring(file.lastIndexOf('.') + 1)
        if (videoType.includes(suffix)) {
          const newItem = {
            path: `${pythonChildProcessPath}/images/${file}`,
            name: file
          }
          picList.push(newItem)
        }
      })
      // 存一下文件列表
      store.set('videoFiles', picList)
      // 如果要删除
      // delete_dir(filePath)
    })
  }
}

// 删除
const delete_dir = (dirPath) => {
  if (existsSync(dirPath)) {
    readdirSync(dirPath).forEach(function (file) {
      let curPath = path.join(dirPath, file)
      if (file === 'test.txt') {
        console.error('不能删')
      } else if (statSync(curPath).isDirectory()) {
        //删除文件夹
        delete_dir(curPath)
      } else {
        //删除文件
        unlinkSync(curPath)
      }
    })
    //删除当前文件夹
    let nameReg = /(.+(?=[/extraResources/images/]$))/
    //删除当前文件夹
    if (!nameReg.test(dirPath)) {
      console.log('nameReg', dirPath)
      rmdirSync(dirPath)
    }
  }
}

const getVideoExtensions = () => {
  return ['tif', '.tif']
}

export interface VideoFile {
  path: string
  name: string
}

export interface ReslutObj {
  code: string
  message?: string
  data?: any
}

const getVideoFromPath = (currPath: string) => {
  if (currPath && existsSync(currPath)) {
    const stats = statSync(currPath)
    if (stats.isFile()) {
      const name = path.basename(currPath)
      const ext = path.extname(name)
      const extensions = getVideoExtensions()
      if (extensions.indexOf(ext.toLowerCase()) >= 0) {
        return {
          path: currPath,
          name: name
        }
      }
    }
  }
  return
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 添加图片
  ipcMain.on('ev:show-open-dialog', async (event) => {
    mainWindow.focus()
    dialog
      .showOpenDialog(mainWindow, {
        title: 'Select Videos',
        properties: ['openFile', 'multiSelections'],
        filters: [{ extensions: getVideoExtensions(), name: 'Picture' }]
      })
      .then((res) => {
        if (!res.canceled) {
          let videoFiles: VideoFile[] = []
          res.filePaths.forEach((p) => {
            const file = getVideoFromPath(p)
            if (file) videoFiles.push(file)
          })

          const picList = store.get('videoFiles') as VideoFile[]
          videoFiles = videoFiles.concat(picList)
          console.log('videoFiles', videoFiles)
          store.set('videoFiles', videoFiles)
          event.returnValue = { code: '000000', data: videoFiles } as ReslutObj
          videoFiles.forEach((item) => {
            var readStream = createReadStream(item.path) // 被复制文件

            // 创建一个写入流
            var writeStream = createWriteStream(`${pythonChildProcessPath}/images/${item.name}`) // 复制到的目标位置及文件
            // 读取流的内容通过管道流写入到输出流
            readStream.pipe(writeStream)
          })
        } else {
          event.returnValue = { code: '060606', message: '文件选择错误' } as ReslutObj
        }
      })
  })

  // 清空图片
  ipcMain.on('ev:del-picture', async (event) => {
    let pathObj = `${pythonChildProcessPath}/images/`
    delete_dir(pathObj)
    event.returnValue = { code: '000000', message: '删除成功' } as ReslutObj
    store.set('videoFiles', [])
  })

  //处理图片
  ipcMain.on('ev:set-picture', async (event) => {
    // 执行python程序
    const processPy = spawn(pythonPath, [`${pythonChildProcessPath}/server.py`], {
      cwd: pythonChildProcessPath
    })
    // 接收子进程标准输出
    processPy.stdout.on('data', (data) => {
      const reslut = data.toString()
      console.log('进程启动成功', reslut)
    })
    processPy.stderr.on('data', (data) => {
      console.error('进程报错', data.toString())
      event.returnValue = { code: '909090', message: data.toString(), data: '' } as ReslutObj
    })
    const picListStore = (store.get('videoFiles') || []) as VideoFile[]
    const timeNum: number = picListStore.length * 1500 || 5000
    console.log('timeNum', timeNum)
    // 复制到输出目录
    setTimeout(() => {
      const filePath: any = store.get('filePath')
      const time = moment(Date.now()).format('YYYY-MM-DD-HH-mm-ss')
      const objPath = `${pythonChildProcessPath}/images`
      mkdir(`${filePath}/\/${time}`, () => {})
      console.log('objPath', objPath)
      // 复制文件到目录
      cp(objPath, `${filePath}/\/${time}`, { recursive: true }, () => {})
      event.returnValue = { code: '000000', message: '处理图片成功', data: '' } as ReslutObj
    }, timeNum)
    // shell.showItemInFolder(`${filePath}/\/${time}`)
  })

  // 打开图片
  ipcMain.on('ev:find-picture', async (event, arg: number) => {
    const videoFiles = (store.get('videoFiles') || []) as VideoFile[]
    const videoObj = videoFiles[arg] as any
    console.log('videoObj[path as keyof typeof videoObj]', videoObj.path)
    shell.showItemInFolder(videoObj.path)
    event.returnValue = { code: '000000', message: '打开成功', data: '' } as ReslutObj
  })

  //设置输出目录
  ipcMain.on('ev:edit-path', async (event) => {
    mainWindow.focus()
    dialog
      .showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
      })
      .then((res) => {
        store.set('filePath', res.filePaths[0])
        event.returnValue = { code: '000000', message: '修改成功', data: res } as ReslutObj
      })
  })

  // 打开输出目录
  ipcMain.on('ev:open-out', async (event) => {
    const filePath: any = store.get('filePath') || ''
    shell.openPath(filePath)
    event.returnValue = { code: '000000', message: '打开成功', data: '' } as ReslutObj
  })

  createWindow()

  creatWorker({ workerData: 'worker' })
    .on('message', (message) => {
      console.log(`\nMessage from worker: ${message}`)
    })
    .postMessage('')

  callFork()
  storeCall()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
