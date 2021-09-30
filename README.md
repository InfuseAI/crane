<img src="https://raw.githubusercontent.com/InfuseAI/crane/main/public/images/Logo_hori.png" alt="Crane" style="height: 130px;">

[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white)](https://discord.com/invite/ZE8pQ8gRWy)

An easier, mode modern way to manage your docker images.

> Like crane? Crane works better with [PrimeHub](https://primehub.io). Crane is the best companion of PrimeHub when it comes to managing docker images. [Try PrimeHub Now](http://one.primehub.io/) and join our [discord community](https://discord.com/invite/ZE8pQ8gRW)!

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
