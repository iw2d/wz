import * as fs from 'node:fs';
import * as path from 'node:path';

import { WzReader } from "../src/reader.js";
import { WZ_GMS_IV, WZ_EMPTY_IV } from '../src/constants.js';

async function readWzFile(fileName, iv, version) {
    console.log(`Reading ${fileName}`);
    const start = new Date();
    const filePath = path.resolve('test', 'wz', fileName);
    const blob = await fs.openAsBlob(filePath);
    const data = await blob.arrayBuffer();
    console.log(`Created array buffer in ${new Date() - start} ms`);
    const reader = WzReader.build(data, iv, version);
    reader.readPackage();
    console.log(`Read package in ${new Date() - start} ms`);
}

readWzFile("TamingMob_GMS_75.wz", WZ_GMS_IV, 75);
readWzFile("TamingMob_GMS_87.wz", WZ_GMS_IV, 87);
readWzFile("TamingMob_GMS_95.wz", WZ_GMS_IV, 95);
readWzFile("TamingMob_GMS_146.wz", WZ_EMPTY_IV, 146);
readWzFile("TamingMob_GMS_176.wz", WZ_EMPTY_IV, 176);
// readWzFile("TamingMob_GMS_230.wz", GameConstants.WZ_EMPTY_IV, 230);

readWzFile("TamingMob_SEA_135.wz", WZ_EMPTY_IV, 135);
readWzFile("TamingMob_SEA_160.wz", WZ_EMPTY_IV, 160);
// readWzFile("TamingMob_SEA_211.wz", WZ_EMPTY_IV, 211);
// readWzFile("TamingMob_SEA_212.wz", WZ_EMPTY_IV, 212);
