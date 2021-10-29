<img src="https://raw.githubusercontent.com/InfuseAI/crane/main/public/images/Logo_hori.png" alt="Crane" style="height: 130px;">

[![GitHub release](https://img.shields.io/github/release/infuseAI/crane/all.svg)](https://github.com/infuseAI/crane/releases)
![workflow](https://github.com/InfuseAI/crane/actions/workflows/build.yml/badge.svg?branch=main)
![](https://img.shields.io/badge/Present-InfuseAI-blue)
![](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)
[![InfuseAI Discord Invite](https://img.shields.io/discord/664381609771925514?color=%237289DA&label=chat&logo=discord&logoColor=white)](https://discord.gg/ZE8pQ8gRWy)

[![](https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=crane)](https://www.producthunt.com/posts/crane)

An easy and beautiful way to manage and build your docker images.

> Like crane? Crane works better with [PrimeHub](http://one.primehub.io/). Crane is the best companion of PrimeHub when it comes to managing docker images. [Try PrimeHub Now](http://one.primehub.io/) and join our [discord community](https://discord.com/invite/ZE8pQ8gRW)!

<img width="1136" alt="CleanShot 2021-10-19 at 02 41 12@2x" src="https://user-images.githubusercontent.com/935988/137788380-f5632f67-a5f4-42fe-b802-da2387cfa41f.png">
<img width="1136" alt="CleanShot 2021-10-19 at 02 41 36@2x" src="https://user-images.githubusercontent.com/935988/137788310-d48dc8e9-cc47-479f-95da-5c651129b57f.png">

## Install

Download the latest version from our [releases](https://github.com/infuseAI/crane/releases) page.

## Build and development

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
