# Development

This document describes the process for running this application on your local computer.

## Getting started

Crane has been developed on Windows and MacOS(M1). It supposed to support Linux too, but you may have to try yourself. 

### Requirement

- Node JS >= 14
- Yarn
- cross-env

### Run with dev mode

```bash
yarn install
yarn dev
```

When you run Crane in dev mode, there will be 2 windows popped up. One is the Crane main window, the other one is the background process window. You can launch the Chrome DevTools to debug Crane.

### Run with VSCode debugger

If you feel more comfortable using debugger inside editor like vscode, instead of using the Chrome DevTools on our background process window, you can disable the background process window feature in our development mode so your editor can attach the debugger to our background process.

1. Open the project with VSCode

2. Click `Run and Debug` tab

3. Click `JavaScript Debug Terminal`

![VSCode Debugger](public/images/vscode-debugger.png)

4. Exec the following commands in the JavaScript Debug Terminal

```bash
cross-env FORCE_BACKGROUND_PROCESS=1 yarn dev
```

### Build

Run `yarn build` to build the executable file.