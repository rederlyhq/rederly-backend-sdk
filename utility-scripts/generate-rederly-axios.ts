#!/usr/bin/env -S npx ts-node
import routesObject from '@rederly/backend-validation/lib/validations/routes';
import fs from 'fs';
const destFile = './src/rederly-axios.ts';

const fileHead =
`/* Auto generated */
import { Method } from 'axios';
import * as index from '@rederly/backend-validation'
import { AxiosWrapper, RequiredBy, RederlyAxiosRequestConfig } from "./axios-utilities";
export class RederlyAxiosWrapper extends AxiosWrapper {
`;

const fileTail =
`
}
`;

interface HttpMethodObject {
    method: string;
    responseCodes: number[];
    requestSchemas: string[];
    isIndex: boolean;
    operationId: string;
};
(async () => {
    await fs.promises.writeFile(destFile, fileHead);

    for (const route in routesObject) {
        const routeObject = routesObject[route];
        for(const httpMethod in routeObject) {
            const httpMethodObject = routeObject[httpMethod] as HttpMethodObject
            const hasBody = httpMethodObject.requestSchemas.includes('body');
            const hasParams = httpMethodObject.requestSchemas.includes('params');
            const hasQuery = httpMethodObject.requestSchemas.includes('query');
            
            const orderedRequestParts: string[] = [];
            // if (hasParams) orderedRequestParts.push("'params'");
            if (hasQuery) orderedRequestParts.push("'params'");
            if (hasBody) orderedRequestParts.push("'data'");

            const orderedRequestGenerics: string[] = [];
            orderedRequestGenerics.push(hasParams ? `index.${httpMethodObject.operationId}.IParams` : 'never');
            orderedRequestGenerics.push(hasQuery ? `index.${httpMethodObject.operationId}.IQuery` : 'never');
            orderedRequestGenerics.push(hasBody ? `index.${httpMethodObject.operationId}.IBody` : 'never');
            const requestGenerics = orderedRequestGenerics.join(', ');

            const responseParts = httpMethodObject.responseCodes.map(code => `index.${httpMethodObject.operationId}.I${code}`).join(' | ');
            let configType = `RederlyAxiosRequestConfig<${requestGenerics}>`;
            if (orderedRequestParts.length > 0) configType = `RequiredBy<${configType}, ${orderedRequestParts.join(' | ')}>`;
            fs.promises.appendFile(destFile,
`
${httpMethodObject.operationId} (config: ${configType}) {
    const adjustedConfig = {
        ...config,
        method: '${httpMethodObject.method}' as Method,
        url: '${route}'
    }
    return this.typedRequest<${requestGenerics}, ${responseParts}>(adjustedConfig);
};
`)
        }
    }
    await fs.promises.appendFile(destFile, fileTail);
})();
