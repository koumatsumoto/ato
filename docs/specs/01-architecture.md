# 01. Architecture

ATO は GitHub Pages 上の SPA と、外部認証基盤 `gh-auth-bridge` で構成する。

## 構成

- `apps/spa`: アプリケーション UI と GitHub API 呼び出し
- `gh-auth-bridge`: GitHub OAuth callback / refresh を仲介する Cloudflare Worker
- `ato-datastore`: 永続化先の private GitHub repository

## 認証責務分離

- ATO は token を直接交換しない
- ATO は `gh-auth-bridge` の popup contract と refresh endpoint を利用する
- auth token は shared storage key `gh-auth-bridge:*` に保存する

## 主要データフロー

1. SPA login
2. `gh-auth-bridge` で OAuth 認可
3. token を localStorage に保存
4. SPA が GitHub REST API を直接呼ぶ
