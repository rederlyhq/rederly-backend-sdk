import Axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import { validateAndCheckForAdditionalKeys, AJVSchema } from '@rederly/backend-validation/lib/rederly-ajv-wrapper'
import _ from 'lodash';
import { sharedLogger, _reddash } from '@rederly/rederly-utils';

export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

type TypedAxiosRequestConfig<ParamsType = unknown, QueryType = unknown, BodyType = unknown> =
{
    params?: QueryType;
    pathParams?: ParamsType;
    data?: BodyType;
}
&
Omit<AxiosRequestConfig, 'params' | 'data'>;

export type RederlyAxiosRequestConfig<ParamsType = unknown, QueryType = unknown, BodyType = unknown> = Omit<TypedAxiosRequestConfig<ParamsType, QueryType, BodyType>, 'url'>;

type RederlyAxiosWrapperOptions = {
    axios: AxiosInstance;
} | {
    axiosConfig?: AxiosRequestConfig;
};

interface IValidateOptions<InputType> {
    schema: AJVSchema;
    data: InputType;
    route: string;
    httpMethod: string;
};

export class AxiosWrapper {
    public readonly axios: AxiosInstance;
    constructor(options: RederlyAxiosWrapperOptions) {
        if ('axios' in options) {
            this.axios = options.axios;
        } else {
            this.axios = Axios.create(options.axiosConfig);
        }
    }

    typedRequest<ParamsType = unknown, QueryType = unknown, BodyType = unknown, ResponseType = unknown>(config: TypedAxiosRequestConfig<ParamsType, QueryType, BodyType>) {
        let url = config.url;
        for (const key in config.pathParams) {
            const paramValue = config.pathParams?.[key as keyof typeof config.pathParams] as any;
            url = url?.replace(`{${key}}`, paramValue?.toString() ?? '');
        }
        // Remove optionals
        url = url?.replace(/\/?\{.+\}\/?/, '');
        // Shallow clone in order to avoid modifying base object
        config = {
            ...config,
            url: url
        };
        // Not support by axios, deleting to avoid conflicts in future
        delete config.pathParams;
        return this.axios.request<ResponseType>(config);
    }

    validate<ValidatedType = unknown, InputType = unknown>({
        schema,
        data,
        route,
        httpMethod
    }: IValidateOptions<InputType>): ValidatedType {
        const {result, additionalKeys} = validateAndCheckForAdditionalKeys<ValidatedType, InputType>({
            data: data,
            schema: schema,
        });
        if (additionalKeys.length > 0) {
            sharedLogger.warn(`Additional keys found on route "${httpMethod}" "${route}" [${additionalKeys.join(', ')}]`);
        }
        return result;
    }
}
