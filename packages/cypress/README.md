# Snapvisor Cypress integration

[![npm version](https://img.shields.io/npm/v/@snapvisor/cypress.svg)](https://www.npmjs.com/package/@snapvisor/cypress)
[![npm dm](https://img.shields.io/npm/dm/@snapvisor/cypress.svg)](https://www.npmjs.com/package/@snapvisor/cypress)
[![npm dt](https://img.shields.io/npm/dt/@snapvisor/cypress.svg)](https://www.npmjs.com/package/@snapvisor/cypress)

Capture stable Snapvisor screenshots from your [Cypress](https://www.cypress.io/) tests.

Visit the [Cypress SDK documentation](https://snapvisor.io/docs/sdks) for guides, the API reference, and more.

## Installation

```sh
npm install --save-dev @snapvisor/cypress
```

## Usage

Register the Snapvisor task in your Cypress config:

```ts
// cypress.config.js
const { defineConfig } = require("cypress");
const { registerSnapvisorTask } = require("@snapvisor/cypress/task");

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      registerSnapvisorTask(on, config, {
        // Upload the screenshots to Snapvisor only on CI.
        uploadToSnapvisor: !!process.env.CI,
      });

      return config;
    },
  },
});
```

Import the command in your support file:

```ts
// cypress/support/e2e.js
import "@snapvisor/cypress/support";
```

Then capture stable screenshots with `cy.snapvisorScreenshot` in your tests:

```ts
// cypress/e2e/example.cy.js
describe("Homepage", () => {
  it("takes a screenshot", () => {
    cy.visit("http://localhost:3000");
    cy.snapvisorScreenshot("homepage");
  });
});
```

> The Argos-named exports from earlier versions (`registerArgosTask`, `uploadToArgos`, `cy.argosScreenshot`) still work.

## Links

- [Snapvisor SDK docs](https://snapvisor.io/docs/sdks)
- [Getting started](https://snapvisor.io/docs/getting-started)

## Attribution

Based on [Argos](https://github.com/argos-ci/argos-javascript) (MIT, Copyright 2022 Smooth Code). Snapvisor modifications are copyright Devino Solutions Inc. See the [LICENSE](https://github.com/DevinoSolutions/snapvisor-js/blob/main/LICENSE).
