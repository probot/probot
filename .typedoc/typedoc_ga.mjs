// Apache License 2.0 - https://github.com/TypeStrong/typedoc/blob/master/LICENSE
import td from "typedoc";

/** @param {td.Application} app */
export function load(app) {
    app.options.addDeclaration({
        name: "gaID",
        help: "Set the Google Analytics tracking ID and activate tracking code",
        type: td.ParameterType.String,
    });

    app.renderer.hooks.on("body.end", () => {
        const gaID = app.options.getValue("gaID");
        if (gaID) {
            const script = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaID}');
`.trim();
            return td.JSX.createElement(td.JSX.Fragment, null, [
                td.JSX.createElement("script", {
                    async: true,
                    src: "https://www.googletagmanager.com/gtag/js?id=" + gaID,
                }),
                td.JSX.createElement("script", null, td.JSX.createElement(td.JSX.Raw, { html: script })),
            ]);
        }
        return td.JSX.createElement(td.JSX.Fragment, null);
    });
}
