## [1.0.2](https://github.com/WYRE-AI/node-kaseya-bms/compare/v1.0.1...v1.0.2) (2026-08-25)


### Bug Fixes

* migrate to WYRE-AI org (npm scope, ghcr namespace, registry) ([#45](https://github.com/WYRE-AI/node-kaseya-bms/issues/45)) ([555c114](https://github.com/WYRE-AI/node-kaseya-bms/commit/555c1142adda8a8888ff24f18d55eda84f0b80b9))

## [1.0.1](https://github.com/wyre-technology/node-kaseya-bms/compare/v1.0.0...v1.0.1) (2026-05-20)


### Bug Fixes

* correct package exports so CJS/ESM resolve (+ packaging hardening) ([#2](https://github.com/wyre-technology/node-kaseya-bms/issues/2)) ([48b4ad4](https://github.com/wyre-technology/node-kaseya-bms/commit/48b4ad4764a7436f0ede80bbd9872d190395d630))

# 1.0.0 (2026-05-01)


### Features

* initial SDK scaffold for Kaseya BMS REST API v2 ([436eaff](https://github.com/wyre-technology/node-kaseya-bms/commit/436eafffb91c74ccf04a141692085facfc988fa8))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- HTTPS enforcement for caller-supplied `baseUrl`: `normalizeBaseUrl` now
  rejects non-`https:` schemes (plain `http://` is still allowed for
  `localhost`/`127.0.0.1` to support local testing), throwing `KaseyaBmsError`.
- `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.
- CI workflow (`.github/workflows/ci.yml`) running lint, type check, build, and
  tests on pull requests and pushes.

### Changed

- Added `type: "module"` so `tsup` emits CJS/ESM artifacts matching the
  package `exports` map.
- Standardized the toolchain on Node 22: `tsup` build target `node22` and
  `@types/node` bumped to `^22`.

## [0.1.0] - 2025-05-01

### Added

- Initial release of the Kaseya BMS SDK: a comprehensive, fully-typed
  Node.js/TypeScript client for the Kaseya BMS PSA REST API v2.
- Dual authentication support: long-lived API tokens and Kaseya One SSO
  (JWT) bearer tokens.
- HTTP client with rate limiting (300 req/min per tenant), automatic retries
  on 429/transient errors, and pagination helpers.
- Typed error classes covering authentication, authorization, validation,
  not-found, rate-limit, application-level, and server errors.
- Resource modules and TypeScript type definitions for the BMS API surface.
