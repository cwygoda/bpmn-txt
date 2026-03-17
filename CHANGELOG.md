# [0.15.0](https://github.com/cwygoda/bpmn-txt/compare/v0.14.0...v0.15.0) (2026-03-17)


### Bug Fixes

* **ci:** add vscode-bpmn-txt to workspace for release builds ([0834e58](https://github.com/cwygoda/bpmn-txt/commit/0834e58f9d00cbaa25f8b38956ef9da941e63c23))
* **layout:** cascade normalized pool width to lanes ([9133229](https://github.com/cwygoda/bpmn-txt/commit/9133229c13c3ca7617220676f6ff390061e241bf))
* **layout:** clamp collapsed pool Y to prevent negative coordinates ([950c8cb](https://github.com/cwygoda/bpmn-txt/commit/950c8cb6071cb8d2c987c14eb0cdd927e1c1dfaf))
* **layout:** collect boundary events for ELK layout ([6d74f82](https://github.com/cwygoda/bpmn-txt/commit/6d74f82a5d383a509b89476b498066ebe95cffb0))
* **layout:** expand pools to contain message flow waypoints with margin ([963b124](https://github.com/cwygoda/bpmn-txt/commit/963b124000e47c153a4b77f688f8755dd292d40d))
* **layout:** use nullish coalescing for ELK spacing options ([2b9a81c](https://github.com/cwygoda/bpmn-txt/commit/2b9a81c6fdf01c407f139920186088f4ed0782e2))
* **playground:** correct zoom fit-viewport padding and overflow ([43188d7](https://github.com/cwygoda/bpmn-txt/commit/43188d7a6252e8cb9c08572842ae077d9218bc94))
* **playground:** force full-width override to beat Svelte scoped specificity ([363ccf2](https://github.com/cwygoda/bpmn-txt/commit/363ccf2c37958151ee9725855c0d9ee94b1b1b13))
* **routing:** add null guard for waypoints in message flow routing ([6f69abb](https://github.com/cwygoda/bpmn-txt/commit/6f69abbe70e2387aa7ac475e96138ecc90a74bcc))
* **routing:** cap EXIT_STUB to pool gap/3 for adjacent pools ([7a9c06a](https://github.com/cwygoda/bpmn-txt/commit/7a9c06ae324a5eedeb6f3d072435347ed7be9328))
* **routing:** center port spread symmetrically across element width ([b67abcb](https://github.com/cwygoda/bpmn-txt/commit/b67abcb3fd463069fac95fc78ebf87ea06a2251f))
* **routing:** enforce pool edge margin for non-adjacent message flows ([2c7e226](https://github.com/cwygoda/bpmn-txt/commit/2c7e226bf2726bb01bb1a028c5c3cce6d90b76d8))
* **routing:** fan-out distributes middle peers along vertical edge ([a3b18f2](https://github.com/cwygoda/bpmn-txt/commit/a3b18f2ac71d6ce42fe59a84bd9158d9a4889a51))
* **routing:** keep non-adjacent message flows within pool bounds ([90d9fb1](https://github.com/cwygoda/bpmn-txt/commit/90d9fb15a6a920c694a8be7e8b67e9853bd8d4ee))
* **routing:** pass stub direction to A* and add angular threshold for fan-out ([e05837f](https://github.com/cwygoda/bpmn-txt/commit/e05837fa5f62f1a1017d47d9f6df974e4188ba29))
* **routing:** prevent inward bends, stale ELK edges, and port collisions ([288ab88](https://github.com/cwygoda/bpmn-txt/commit/288ab88b276eab44a78698225139d4556c9f7a4a))
* **routing:** reduce PARALLEL_TOLERANCE from 5px to 2px ([8800e7a](https://github.com/cwygoda/bpmn-txt/commit/8800e7a4874436e46dba309bcc5df6e8160eb739))
* **routing:** spread message flow ports globally across pool-pair groups ([bdc1643](https://github.com/cwygoda/bpmn-txt/commit/bdc16436f708713bbf82c6cf3cd9d981af87d754))
* **routing:** spread message flow ports when multiple flows share an element ([25f9efd](https://github.com/cwygoda/bpmn-txt/commit/25f9efdff5a8950059d30d1d1d967000be143f56))
* **routing:** use direction-based edge selection in computeFanOut ([f7354f4](https://github.com/cwygoda/bpmn-txt/commit/f7354f40b188f654ff83913b12795f4b3ddf2af1))
* **routing:** Z-shape fallback now avoids obstacles ([f0df2d3](https://github.com/cwygoda/bpmn-txt/commit/f0df2d3a62b8315c444afe9933679cbd1e47aee4))


### Features

* **diagram:** add BPMNLabel positioning for flows with name/condition ([4322d90](https://github.com/cwygoda/bpmn-txt/commit/4322d90fced4bdbb767abd33824badea825a2cc7))
* **docs:** add three-state theme switcher (light/dark/system) ([87ec50b](https://github.com/cwygoda/bpmn-txt/commit/87ec50b0707353c9b8134a654c662b9014766ec2))
* **docs:** auto-size BPMN diagram viewer with scale and padding props ([74065df](https://github.com/cwygoda/bpmn-txt/commit/74065dfa20b1dbd1e977371ce42fa4b9f0e4ff92))
* **docs:** examples page with live BPMN diagram rendering ([52722ab](https://github.com/cwygoda/bpmn-txt/commit/52722ab7df01b4f58cac2b354f131eef29fcdbd6))
* **docs:** live-reload source changes in dev server ([6f09e3d](https://github.com/cwygoda/bpmn-txt/commit/6f09e3da3fef18db5aab97e2b743c2be2338034b))
* **layout:** support expanded subprocess internal layout via ELK nesting ([3704efa](https://github.com/cwygoda/bpmn-txt/commit/3704efabfba056c01267c0ec808455ebc3cff709))
* **routing:** gateway fan-out and pool-edge message flow routing ([67a4b64](https://github.com/cwygoda/bpmn-txt/commit/67a4b641ea3737f9fadcac84531deff370469239))
* **routing:** pool label width proportional to name length ([bdbf82b](https://github.com/cwygoda/bpmn-txt/commit/bdbf82bd3a205bcaedf2f796339d79564ca76535))


### Performance Improvements

* **layout:** cache collectFromPool results to avoid redundant calls ([34380d3](https://github.com/cwygoda/bpmn-txt/commit/34380d3e22b554646997941974249073639692b3))
* **routing:** binary search in coordToIdx instead of indexOf ([5245d89](https://github.com/cwygoda/bpmn-txt/commit/5245d89eb04a59e46d392ef067d07f41f19a5e49))
* **routing:** replace sorted-array priority queue with binary heap ([4141930](https://github.com/cwygoda/bpmn-txt/commit/4141930549e01a2bebe9b381862b511b3922e4be))


### Reverts

* Revert "fix(layout): expand pools to contain message flow waypoints with margin" ([2b60df9](https://github.com/cwygoda/bpmn-txt/commit/2b60df9164633e49f9eae17246d7d105b540cb9b))

# [0.14.0](https://github.com/cwygoda/bpmn-txt/compare/v0.13.3...v0.14.0) (2026-03-03)


### Bug Fixes

* **routing:** model pool label zones as obstacles for message flows ([a873ec6](https://github.com/cwygoda/bpmn-txt/commit/a873ec60cc8c8d1f7f93f668361f53d8fd994a23))


### Features

* **playground:** expand to full viewport width and hide footer ([4f7673e](https://github.com/cwygoda/bpmn-txt/commit/4f7673ecedccb0e6a9d212ecc23b8dbc6518a9fe))
* **routing:** obstacle-aware orthogonal routing for message flows ([2ea00a7](https://github.com/cwygoda/bpmn-txt/commit/2ea00a7d1733bafefac8f6668e22da379bcdded9))

## [0.13.3](https://github.com/cwygoda/bpmn-txt/compare/v0.13.2...v0.13.3) (2026-03-02)


### Bug Fixes

* re-route cross-lane sequence flows using final node positions ([1c38dcd](https://github.com/cwygoda/bpmn-txt/commit/1c38dcd8050fe8c30b7babb4f05585a5e22ee771))
* resolve 404 on GitHub Pages reload for non-root routes ([03a21f2](https://github.com/cwygoda/bpmn-txt/commit/03a21f232a78be8edd3aafd3e756c79394bf0d44))

## [0.13.2](https://github.com/cwygoda/bpmn-txt/compare/v0.13.1...v0.13.2) (2026-03-02)


### Bug Fixes

* stack lanes vertically within pools to prevent overlap ([037eb74](https://github.com/cwygoda/bpmn-txt/commit/037eb7439fb8e2cd0f87feabb13332ffc9831c27))

## [0.13.1](https://github.com/cwygoda/bpmn-txt/compare/v0.13.0...v0.13.1) (2026-03-02)


### Bug Fixes

* remove BPMNLabel from message flow edges ([296e93f](https://github.com/cwygoda/bpmn-txt/commit/296e93fc7a5171095853817a81d509569e73b54e))

# [0.13.0](https://github.com/cwygoda/bpmn-txt/compare/v0.12.0...v0.13.0) (2026-03-02)


### Features

* center BPMNLabel on message flow edges ([e48bb3a](https://github.com/cwygoda/bpmn-txt/commit/e48bb3a94280358670dd52497a6edaad7aec3895))

# [0.12.0](https://github.com/cwygoda/bpmn-txt/compare/v0.11.1...v0.12.0) (2026-03-02)


### Features

* emit bpmn:message elements and messageRef on message flows ([8b34618](https://github.com/cwygoda/bpmn-txt/commit/8b34618ce7b843b737acf82b4b4bd6fbdd3bd77e))

## [0.11.1](https://github.com/cwygoda/bpmn-txt/compare/v0.11.0...v0.11.1) (2026-03-02)


### Bug Fixes

* emit bpmn:incoming/outgoing on flow nodes in XML output ([f169d1e](https://github.com/cwygoda/bpmn-txt/commit/f169d1efaf7caaade6e38c94cbe028ef8dd5b41c))

# [0.11.0](https://github.com/cwygoda/bpmn-txt/compare/v0.10.0...v0.11.0) (2026-03-02)


### Bug Fixes

* resolve bpmnlint JSDoc type incompatibility ([1fe8b94](https://github.com/cwygoda/bpmn-txt/commit/1fe8b947a1a204d321a34085bc06b681c0f4c3df))


### Features

* support extends in lint config ([223fac7](https://github.com/cwygoda/bpmn-txt/commit/223fac77ed7cabbab68e31b96a018d49aae2d03f))

# [0.10.0](https://github.com/cwygoda/bpmn-txt/compare/v0.9.1...v0.10.0) (2026-03-02)


### Bug Fixes

* **docs:** harden accessibility and dark mode contrast ([ed66184](https://github.com/cwygoda/bpmn-txt/commit/ed6618467f4b88ec9dad3c5fbb14bc5ead751509))


### Features

* **layout:** orthogonal routing for cross-pool message flows ([9d0c903](https://github.com/cwygoda/bpmn-txt/commit/9d0c9032b7c2387e83d6bf3686224c8ebe4b3623))

## [0.9.1](https://github.com/cwygoda/bpmn-txt/compare/v0.9.0...v0.9.1) (2026-02-27)


### Bug Fixes

* route inline flows to pool-level sequenceFlows ([b9080b7](https://github.com/cwygoda/bpmn-txt/commit/b9080b73ca3187665e4c8dfa1fa70e395d1c9018))

# [0.9.0](https://github.com/cwygoda/bpmn-txt/compare/v0.8.3...v0.9.0) (2026-02-27)


### Features

* **vscode:** syntax highlighting in markdown fenced code blocks ([8c85ef3](https://github.com/cwygoda/bpmn-txt/commit/8c85ef3412f088bf07405444f90d2ff655e965a3))

## [0.8.3](https://github.com/cwygoda/bpmn-txt/compare/v0.8.2...v0.8.3) (2026-02-27)


### Bug Fixes

* accept input without trailing newline ([332ef0d](https://github.com/cwygoda/bpmn-txt/commit/332ef0dde354efff08ac1c17c95600e5281458a5))

## [0.8.2](https://github.com/cwygoda/bpmn-txt/compare/v0.8.1...v0.8.2) (2026-02-27)


### Bug Fixes

* **release:** upgrade npm and remove registry-url for OIDC auth ([ba1ddec](https://github.com/cwygoda/bpmn-txt/commit/ba1ddec8899c5bc54905b2d122a7541d2c06b734))

## [0.8.1](https://github.com/cwygoda/bpmn-txt/compare/v0.8.0...v0.8.1) (2026-02-27)


### Bug Fixes

* **release:** enable provenance for npm OIDC trusted publishing ([90809bf](https://github.com/cwygoda/bpmn-txt/commit/90809bf3584601594eba0d163620754d29458510))

# [0.8.0](https://github.com/cwygoda/bpmn-txt/compare/v0.7.0...v0.8.0) (2026-02-27)


### Features

* switch to npm trusted publishing (OIDC) ([9fdd596](https://github.com/cwygoda/bpmn-txt/commit/9fdd596d53df6e12f98f99cbf16bb3971c5a663e))

# [0.7.0](https://github.com/cwygoda/bpmn-txt/compare/v0.6.0...v0.7.0) (2026-02-27)


### Features

* rename to @cwygoda/bpmn-txt and enable npm publishing ([d592369](https://github.com/cwygoda/bpmn-txt/commit/d59236942ba9dbb0499ba44701d4ebc50f145d00))

# [0.6.0](https://github.com/cwygoda/bpmn-txt/compare/v0.5.0...v0.6.0) (2026-02-26)


### Bug Fixes

* emit separate bpmn:process per pool for valid multi-pool XML ([23ee1e9](https://github.com/cwygoda/bpmn-txt/commit/23ee1e919e71e23aadf5d33f44d44e18e055ac8f))
* per-pool ELK layout with vertical stacking ([624c32f](https://github.com/cwygoda/bpmn-txt/commit/624c32f931165a519df8e7bcda14c48004df3096))


### Features

* **playground:** persist editor content in localStorage ([153c1f1](https://github.com/cwygoda/bpmn-txt/commit/153c1f176183a67f32402a30ab82662147ac7b42))

# [0.5.0](https://github.com/cwygoda/bpmn-txt/compare/v0.4.0...v0.5.0) (2026-02-26)


### Features

* add doc and service attributes for service catalog integration ([f824ce6](https://github.com/cwygoda/bpmn-txt/commit/f824ce6a83310c31690c465d4a4f55d9077d2f31))

# [0.4.0](https://github.com/cwygoda/bpmn-txt/compare/v0.3.0...v0.4.0) (2026-02-24)


### Features

* **vscode:** add zoom controls to preview ([763d808](https://github.com/cwygoda/bpmn-txt/commit/763d80845fac65d711183502dc0bda2cd5279f69))

# [0.3.0](https://github.com/cwygoda/bpmn-txt/compare/v0.2.0...v0.3.0) (2026-02-24)


### Features

* **vscode:** add LSP with diagnostics, completion, go-to-def, preview ([75c1e14](https://github.com/cwygoda/bpmn-txt/commit/75c1e149787a112662039a24c431c4d08e2ad95c))

# [0.2.0](https://github.com/cwygoda/bpmn-txt/compare/v0.1.1...v0.2.0) (2026-02-24)


### Features

* **vscode:** add syntax highlighting extension ([07d3a96](https://github.com/cwygoda/bpmn-txt/commit/07d3a96d788845b8dbda1936babc7ab2023f6b4a))

## [0.1.1](https://github.com/cwygoda/bpmn-txt/compare/v0.1.0...v0.1.1) (2026-02-24)


### Bug Fixes

* **ci:** release after CI passes, not in parallel ([7fe43ab](https://github.com/cwygoda/bpmn-txt/commit/7fe43abe13bb76de3f68fe76d74205747de3fb2b))

# [0.1.0](https://github.com/cwygoda/bpmn-txt/compare/v0.0.0...v0.1.0) (2026-02-24)


### Bug Fixes

* **ci:** build before tests; disable npm publish ([2eb9e27](https://github.com/cwygoda/bpmn-txt/commit/2eb9e27e01a0c1e08239f5eddc057fa7da384e32))
* **ci:** remove redundant pnpm version (uses packageManager field) ([6db5d41](https://github.com/cwygoda/bpmn-txt/commit/6db5d41f1eb9ed78124a148fffc1b333ec54ac51))
* **docs:** add proper dark mode for playground ([a145453](https://github.com/cwygoda/bpmn-txt/commit/a1454531f6a07a1d07be7978aa449ccfc927f126))
* **generators:** default undefined gateway type to exclusive ([28f5e11](https://github.com/cwygoda/bpmn-txt/commit/28f5e1140c7513095ba1889761dd262aa5bb2e05))
* **parser:** reject incorrectly indented flow declarations ([bf0fa2f](https://github.com/cwygoda/bpmn-txt/commit/bf0fa2f25a232e4c78ec40b8245e0886e31180c3))
* **test:** wait for __bpmnTxt before evaluate ([4caec66](https://github.com/cwygoda/bpmn-txt/commit/4caec66bab19979a189374d8bd0d5eda2029e2b6))
* **validator:** include location in unresolved reference errors ([7ae9b54](https://github.com/cwygoda/bpmn-txt/commit/7ae9b54d41127df3d48dae4b0d5e622513d5d356))


### Features

* **docs:** add interactive playground ([f3f679c](https://github.com/cwygoda/bpmn-txt/commit/f3f679c2d68e04935aa50f035fce5cf85af9053a))
* implement Phase 2 - JSON and BPMN XML exporters ([7aa7491](https://github.com/cwygoda/bpmn-txt/commit/7aa7491910bcb5acca155e47f44b6f0cc9fc7147))
* implement Phase 3 - automatic layout with elkjs ([a9eafa8](https://github.com/cwygoda/bpmn-txt/commit/a9eafa887c1b248556d54304d952299771ff4c36))
* implement Phase 4 - CLI tool ([c21cdac](https://github.com/cwygoda/bpmn-txt/commit/c21cdace0810d6b19db465db1342080a56e3342f))
* **lint:** add bpmnlint integration ([796b8fc](https://github.com/cwygoda/bpmn-txt/commit/796b8fce5c72d805502f91ce7afcb5384cc687cd))
* **parser:** implement data association resolution ([9995622](https://github.com/cwygoda/bpmn-txt/commit/99956222b200ae2ff18e4218954ef7480457f64f))
* **parser:** implement inline flow resolution ([76aef58](https://github.com/cwygoda/bpmn-txt/commit/76aef589820aaeb69d990ba6790476fb2d407ac3))
* **parser:** implement multiline string parsing ([f71d3f6](https://github.com/cwygoda/bpmn-txt/commit/f71d3f6cace9b45b521ae823ff4294d90de711b2))
