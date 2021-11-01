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

### Let's chat about Crane 🦩

**So, what is Crane?**

Crane is a minimalist container image builder. You can extend an existing container image with custom apt/conda/pip packages without writing any Dockerfile.

**How does Crane work?**

Crane generates Dockerfile that installs packages according to your settings, and builds the container image with your local docker engine. You can also push images to your Docker Hub registry.

**Why we built Crane?**

Container images are used in many different use cases such as ML. There are lots of ready-to-run container images with Jupyter and various libraries, however people still want to customize images, and this is mostly done through authoring Dockerfile with commands installing additional packages.

Dockerfile is the canonical way for building container images. However, people still want a no-frills way to just simply adding packages to existing images. Crane provides an easier way to build container images without any knowledge of Dockerfile, so the process is more approachable.

We've always had this feature in our open source ML platform PrimeHub to allow customizing container images for a shared and consistent environment. And it's now also available as a standalone desktop app - Crane. 
