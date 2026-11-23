import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';
import noLiteralText from './noLiteralText.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } });

const LITERAL = { messageId: 'literalText' };

ruleTester.run('no-literal-text', noLiteralText, {
  valid: [
    '<p>{t("people.title")}</p>',
    "<span>{' '}</span>",
    '<p>{years} · {generation}</p>',
    '<li>↻ {t("tower.relatedParents")}</li>',
    '<p>{t("chart.lonePerson")} <a href="/">{t("chart.lonePersonLink")}</a>.</p>',
    '<Icon name="close" />',
    '<a href="/api/docs/" className="footer">{t("shell.apiLink")}</a>',
    '<input aria-label={t("people.searchLabel")} placeholder={t("people.searchPlaceholder")} />',
    '<p>{isOpen ? t("tower.hideDetails") : t("tower.showDetails")}</p>',
    '<b className={isOpen ? "open" : "closed"} aria-current={isCurrent ? "page" : undefined} />',
    '<p>{kind === "line" && <Swatch />}</p>',
    '<p>{`${t("states.sessionEndedInline")} `}</p>',
    '<button aria-label={ownName} title={ownName} lang="ru" />',
    '<Dialog title={t("kinship.changeTitle", { name })} />',
  ],
  invalid: [
    { code: '<p>Save changes</p>', errors: [LITERAL] },
    { code: '<p>Привет</p>', errors: [LITERAL] },
    { code: '<p>{"Save"}</p>', errors: [LITERAL] },
    { code: '<p>{isOpen ? "Hide details" : "Show details"}</p>', errors: [LITERAL, LITERAL] },
    { code: '<p>{isLoading && "Loading"}</p>', errors: [LITERAL] },
    { code: '<p>{`Reading ${fileName}`}</p>', errors: [LITERAL] },
    { code: '<input placeholder="Type a name" />', errors: [LITERAL] },
    { code: '<Button aria-label="Close" />', errors: [LITERAL] },
    { code: '<img alt={`${name} (unsaved preview)`} />', errors: [LITERAL] },
    { code: '<Dialog title={`Add a ${noun} of ${name}`} />', errors: [LITERAL] },
    { code: '<ConfirmDialog confirmLabel="Remove link" />', errors: [LITERAL] },
    { code: '<Field label={isOptional ? "Place" : t("x")} />', errors: [LITERAL] },
  ],
});
