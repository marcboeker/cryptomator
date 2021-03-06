# Cryptomator.js

⚠️ _This project is in a prototype state. Please use Chrome as some required APIs are not yet
polyfilled for other browsers._

Cryptomator.js is a [Cryptomator](https://github.com/cryptomator/cryptomator) implementation in
JavaScript/Typescript with a Vuetify front end. No dedicated back end is needed as the complete
application runs natively in the browser.

![demo](https://github.com/marcboeker/cryptomator/raw/master/assets/demo.gif)

There is currently one storage adapter available, which is AWS S3. But any other storage provider
can be added easily. You can even write a custom storage adapter to connect to your own back end.

As all cryptographic operations are handled in the browser and only encrypted data is ever sent and
retrieved from the storage provider, no passwords and keys are passed to any third party.

The project is divided into two components:

- The native JavaScript/Typescript Cryptomator implementation (located under `src/cryptomator`)
- A front end based on Vue.js and Vuetify (located under `src/`) to browse your vault.

The Cryptomator.js lib currently contains the following functionalities:

- Open vault with your password
- Browse vault
- Read/Write files
- Create directories
- Delete files/directories (recursive)
- Move/rename files/directories

Part of the front end is based on
[vuetify-file-browser](https://github.com/semeniuk/vuetify-file-browser).

## Getting started using AWS S3

0. Copy an existing vault to a S3 bucket. Make sure, that the vault is in the root of the bucket.
1. Clone the repository `git clone https://github.com/marcboeker/cryptomator.git`.
2. Install all dependencies with `yarn install`
3. Run the development server with `yarn serve`
4. Open your browser (Chrome) and navigate to [http://localhost:8080](http://localhost:8080). The
   latest Chrome browser is needed, as not all required APIs are yet polyfilled for other browsers.
5. Enter your AWS credentials and S3 bucket that point to your vault. If you store your credentials
   in the local storage, please be aware that they are stored as plaintext.

To compile the app for production, run `yarn build`.

## ToDo

There are still some things to do:

- [ ] Support for long filenames (> 220 chars)
- [ ] Support for symlinks
- [ ] Different storage backends (Google Storage, Dropbox, ...)
- [ ] Parse vault.cryptomator file before retrieving masterkey.cryptomator
- [ ] Speed up scrypt KDF.

## Feedback & Contributions

If you have feedback or want to contribute, please use GitHub issues and file a pull request.
