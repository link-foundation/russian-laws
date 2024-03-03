import { DeepClient } from "@deep-foundation/deeplinks/imports/client.js";
import { htmlToJson } from "./html-to-json.js";
import { jsonToLinks } from "./json-to-links.js";


export async function htmlToLinks({deep, html ,spaceId}: {deep: DeepClient; html: string; spaceId: number }) {

    const json = htmlToJson({ html });

   const result = jsonToLinks({deep,json,spaceId})
   return result;
}
