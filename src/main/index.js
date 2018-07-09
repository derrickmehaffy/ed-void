import {app, BrowserWindow, ipcMain, shell, globalShortcut} from 'electron';

const UI_Settings = {
    height: 800,
    width: 540,
    useContentSize: true,
    show: false,
    frame: false,
    toolbar: false,
    transparent: true,
};

let INTERACT_MODE = true;
let IS_OVERLAY = false;

const IS_DEV = (process.env.NODE_ENV === 'development');

const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    if (UI) {
        if (UI.isMinimized()) UI.restore();
        UI.focus()
    }
});

if (isSecondInstance) app.quit();

if (!IS_DEV) global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\');

let UI;

const winURL = IS_DEV
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`;


const handleRedirect = (e, url) => {
    if (url !== UI.webContents.getURL()) {
        e.preventDefault();
        shell.openExternal(url);
    }
};


function createWindow() {
    UI = new BrowserWindow(UI_Settings);
    UI.webContents.setFrameRate(2);
    UI.loadURL(winURL);
    UI.on('closed', () => {
        UI = null;
        app.quit();
    });

    if (!IS_DEV) UI.maximize();

    UI.webContents.on('will-navigate', handleRedirect);
    UI.webContents.on('new-window', handleRedirect);
    UI.webContents.on('dom-ready', () => {
        UI.show();
        send2UI('set:interact', INTERACT_MODE);
    });
}

app.on('ready', () => {
    createWindow();

    globalShortcut.register('F10', () => {
        IS_OVERLAY = !IS_OVERLAY;

        if (!IS_OVERLAY) INTERACT_MODE = true;
        send2UI('set:interact', INTERACT_MODE);
        send2UI('set:overlay', IS_OVERLAY);

        UI.setIgnoreMouseEvents(!INTERACT_MODE);
        UI.setFocusable(INTERACT_MODE);
        UI.setAlwaysOnTop(IS_OVERLAY);
    });

    globalShortcut.register('F1', () => {
        if (!IS_OVERLAY) return;
        INTERACT_MODE = !INTERACT_MODE;
        send2UI('set:interact', INTERACT_MODE);
        UI.setIgnoreMouseEvents(!INTERACT_MODE)
        UI.setFocusable(INTERACT_MODE);
    });

    globalShortcut.register('F2', () => {
        send2UI('mode:next', INTERACT_MODE);

    });


});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() });
app.on('activate', () => { if (UI === null) createWindow() });


/*

    LET'S CHECK CONFIGS...

*/
ipcMain.on('ipc', function (event, c, data) {
    switch (c) {
        case 'shutdown':
            app.quit();
            break;
        default:
            console.log('IPC/UI:', c, data);
    }

});

// todo: decide where we going to track hot-keys and how to display overlay
function send2UI(c, data) {
    if (UI && UI.webContents) {
        UI.webContents.send('ipc', c, data);
    } else {
        console.log(`Unable to send ${c} to UI - No UI ready`, {c, data});
    }
}

