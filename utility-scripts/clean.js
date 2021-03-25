// Not typescript
/* eslint-disable @typescript-eslint/no-var-requires */

const fse = require('fs-extra');

const dirs = [
    'lib',
];

const promises = dirs.map(async (dir) => {
    const exists = await fse.pathExists(dir);
    if (exists) {
        await fse.remove(dir, {
            recursive: true
        });
    }
});

Promise.all(promises)
.then(() => console.log('Success'))
.catch(e => console.error('An error occurred', e));
