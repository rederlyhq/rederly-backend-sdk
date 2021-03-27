#!/usr/bin/env -S npx ts-node
import routesObject from '@rederly/backend-validation/lib/validations/routes';
import fs from 'fs';
const destFile = './src/rederly-axios.ts';

const fileHead =
`/* Auto generated */
import { Method } from 'axios';
import * as index from '@rederly/backend-validation'
import { AxiosWrapper, RequiredBy, RederlyAxiosRequestConfig } from "./axios-utilities";
import { sharedLogger } from '@rederly/rederly-utils';
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

            let configType = `RederlyAxiosRequestConfig<${requestGenerics}>`;
            if (orderedRequestParts.length > 0) configType = `RequiredBy<${configType}, ${orderedRequestParts.join(' | ')}>`;
            await fs.promises.appendFile(destFile,
`
async ${httpMethodObject.operationId} (config: ${configType}) {
    const adjustedConfig = {
        ...config,
        method: '${httpMethodObject.method}' as Method,
        url: '${route}'
    }
    const result = await this.typedRequest<${requestGenerics}, ${httpMethodObject.responseCodes.length > 0 ? `index.${httpMethodObject.operationId}.IResponse` : 'never'}>(adjustedConfig);
    const schemaKey = \`status\${result.status}Schema\`;
    const schema = schemaKey in index.${httpMethodObject.operationId} && index.${httpMethodObject.operationId}[schemaKey];
    if (schema) {
        this.validate({
            data: result.data,
            httpMethod: index.${httpMethodObject.operationId}.httpMethod,
            route: index.${httpMethodObject.operationId}.route,
            schema: schema
        });
    } else {
        sharedLogger.error(\`Invalid response code "\${result.status}" for "\${index.coursesPostCourses.httpMethod}" "\${index.coursesPostCourses.route}"\`);
        throw new Error(\`Unexpected response \${result.status}\`);
    }
    return result;
};
`)
        }
    }
    await fs.promises.appendFile(destFile, fileTail);
})();
