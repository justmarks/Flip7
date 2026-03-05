#!/usr/bin/env node
// Bumps the patch version in package.json and syncs versionCode/versionName in build.gradle.
// Run automatically by .githooks/pre-commit on every commit.

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// --- package.json ---
const pkgPath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const newVersion = `${major}.${minor}.${patch + 1}`
const oldVersion = pkg.version
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// --- Android/app/build.gradle ---
const gradlePath = resolve(root, 'Android', 'app', 'build.gradle')
let gradle = readFileSync(gradlePath, 'utf8')
gradle = gradle.replace(/versionCode (\d+)/, (_, n) => `versionCode ${Number(n) + 1}`)
gradle = gradle.replace(/versionName ".*?"/, `versionName "${newVersion}"`)
writeFileSync(gradlePath, gradle)

console.log(`Version bumped: ${oldVersion} → ${newVersion}`)
