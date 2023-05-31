import { ipcMain } from 'electron'
import Store from 'electron-store'

const store = new Store()

export default function storeCall(): void {
  // 定义ipcRenderer监听事件
  ipcMain.on('setStore', (_, key, value) => {
    store.set(key, value)
  })

  ipcMain.on('getStore', (_, key) => {
    let value = store.get(key)
    _.returnValue = value || ''
  })

  ipcMain.on('delStore', (_, key) => {
    store.delete(key)
  })
}
