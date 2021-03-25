import { RederlyAxiosWrapper } from './rederly-axios';
import axios from 'axios';

(async () => {
    const tom = new RederlyAxiosWrapper({
        axiosConfig: {
            baseURL: 'http://localhost:3001/backend-api',
            responseType: 'json',
            timeout: 180000, // 180 seconds
                    headers: {
                /**
                 * Forms send this field in the origin header, however that wasn't coming across with the axios request
                 * Adding `origin` myself was getting stripped
                 * Could not find solution online so used a custom header
                 * Other headers don't work because they get modified by aws (between cloudfront and the load balancers)
                 */
                'rederly-origin': 'TOMTOM',
            },
        }
    });

    const res = await tom.usersPostLogin({
        data: {
            email: 'demo+2@prof.rederly.com',
            password: '$@v3D'
        }
    });

    const token = res.headers['set-cookie'];
    if (res.data.statusCode === 200) {
        console.log(res.data.data?.uuid);
    }
    const res2 = await tom.usersGetUsers({
        params: {},
        headers: {
            Cookie: token
        }
    });

    console.log(res2.data);
    const test = await tom.testPostMotmotBySecond({
        data: {
            tomdefaultdate: new Date(),
        },
        params: {
            "1231253": '123'
        }
    });

})();