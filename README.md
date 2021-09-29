![Crane](public/images/Logo_hori.png)

A desktop application for build docker images without docker command-line knowledge.

![Crane Screen Shot](public/images/crane-screenshot.png)
## How to run

### Requirement

- Node JS >= 14
- Yarn
- cross-env

### Run with dev mode

```bash
yarn install
yarn dev
```

### Run with VSCode debugger

1. Open the project with VSCode

2. Click `Run and Debug` tab

3. Click `JavaScript Debug Terminal`

![VSCode Debugger](public/images/vscode-debugger.png)

4. Exec the following commands in the JavaScript Debug Terminal

```bash
cross-env FORCE_BACKGROUND_PROCESS=1 yarn dev
```
