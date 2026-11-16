# coss ui components

The files in this folder (and `src/lib/utils.ts`) come from **coss ui**, https://coss.com/ui,
pulled from its registry (`https://coss.com/ui/r/<name>.json`). coss ui is MIT-licensed
(the `apps/ui` directory of the cosscom/coss repository); keep this notice when copying.

- Only the import paths were changed (`@/registry/default/...` → `@/components/ui/...`, `@/lib/...`).
- The theme (plum + caramel palette, fonts, dark mode) lives in `src/coss.css`.
- Screens built with these components wrap their root in `className="coss"`; Tailwind's global
  preflight is not loaded, so the older inline-styled screens are unaffected.

To add another component: fetch `https://coss.com/ui/r/<name>.json`, write each `files[].content`
to `src/components/ui/`, fix the import paths as above, and pull its `registryDependencies` the same way.

## React 18 note

coss ui is written for React 19, where function components receive `ref` as a normal prop.
Tanelu runs React 18, so **don't pass a coss component through a `render` prop** (e.g.
`<MenuTrigger render={<Button/>}>`): the ref is dropped and popups can't anchor to their trigger.
Style the primitive directly instead: `<MenuTrigger className={buttonVariants({ variant: "outline" })}>`.
