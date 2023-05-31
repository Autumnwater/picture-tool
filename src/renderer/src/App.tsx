import type { Component } from 'solid-js'
import { createSignal, For,Show } from 'solid-js'
import logo from './assets/logo.png'

const App: Component = () => {
  return (
    <div class="container">

      <img class="hero-logo" src={logo} alt="logo" />

      <div class="links features">
        <div class="link-item">
          <a onClick={getImages}>
            添加图片
          </a>
        </div>
        <div class="feature-item">
          <article>
            <h2 class="title">图片队列 <a class="delitem" onClick={clearFiles}>一键清空</a></h2>
            <p class="detail">
              <For each={fileList()} fallback={<div>.</div>}>
                {(item, index) => <a class='feature-item-pic' onClick={($event)=>openPic($event,index())}>{index()+1}.
                  <span>{item.name}</span></a>}
              </For>
            </p>
          </article>
        </div>
        <div class="link-item link-dot">•</div>
        <div class="link-item">
          <a
            onClick={setImages}
          >
            处理图片
          </a>
        </div>
        <div class="feature-item">
          <article>
            <h2 class="title">任务进度</h2>
            <p class="detail">
              Task <span>{isCompany()=== true ?'1，完成':''}</span>
              .
            </p>{isCompany()}
          </article>
        </div>
        <div class="link-item link-dot">•</div>
        <div class="link-item">
          <a
            target="_blank"
            href="https://github.com/alex8088/quick-start/tree/master/packages/create-electron"
            rel="noopener noreferrer"
          >
            显示结果
          </a>
        </div>
        <div class="feature-item">
          <article>
            <h2 class="title">输出目录 <a class="delitem" onClick={editPath}>修改路径</a></h2>

            <p class="detail">
              <a class="openbtn" onClick={openOutPath}>
                打开结果目录： {outrl()}
              </a><br/><br/>
              .
            </p>
          </article>
        </div>
        <Show when={messageObj()}>
          <div class="error-msg">报错信息:{messageObj()}</div>
        </Show>

      </div>
    </div>
  )
}

const [isCompany, setIsCompany] = createSignal(false);

export interface VideoFile {
  path: string
  name: string
}

const picList = window.electron.ipcRenderer.sendSync('getStore', 'videoFiles')

const [fileList, setFileList] = createSignal((picList || []) as VideoFile[]);

const [messageObj, setMessageObj] = createSignal('');

const getImages = () => {
  const reslut = window.electron.ipcRenderer.sendSync('ev:show-open-dialog')
  console.log('reslut', reslut)
  if (reslut.code === '000000') {
    setFileList(reslut.data)
  } else {
    console.error('getImages:message', reslut.message)
    setMessageObj(`getImages:${reslut.message}`)
  }
}
const clearFiles = () => {
  const reslut = window.electron.ipcRenderer.sendSync('ev:del-picture')
  if (reslut.code === '000000') {
    setFileList([])
  } else {
    console.error('clearFiles:message', reslut.message)
    setMessageObj(`clearFiles:${reslut.message}`)
  }
}

const setImages = () => {
  const reslut = window.electron.ipcRenderer.sendSync('ev:set-picture')
  console.log('reslut', reslut)
  if (reslut.code === '000000') {
    setIsCompany(true)
  } else {
    console.error('setImages:message', reslut.message)
    setMessageObj(`setImages:${reslut.message}`)
  }
}
const openPic = (event, index) => {
  console.log('event', event)
  const reslut = window.electron.ipcRenderer.sendSync('ev:find-picture', index)
  if (reslut.code === '000000') {

  } else {
    console.error('openPic:message', reslut.message)
    setMessageObj(`openPic:${reslut.message}`)
  }
}

const filePath = window.electron.ipcRenderer.sendSync('getStore', 'filePath')
const [outrl, setOutrl] = createSignal(filePath ||'');

const editPath = () => {
  const reslut = window.electron.ipcRenderer.sendSync('ev:edit-path')
  if (reslut.code === '000000') {
    setOutrl(reslut.data.filePaths[0])
  } else {
    console.error('editPath:message', reslut.message)
    setMessageObj(`editPath:${reslut.message}`)
  }
}

const openOutPath = () => {
  window.electron.ipcRenderer.sendSync('ev:open-out')
}

export default App
