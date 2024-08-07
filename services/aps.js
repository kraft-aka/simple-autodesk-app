const { SdkManagerBuilder } = require("@aps_sdk/autodesk-sdkmanager");
const { AuthenticationClient, Scopes } = require("@aps_sdk/authentication");
const {
    OssClient,
    CreateBucketsPayloadPolicyKeyEnum,
    CreateBucketXAdsRegionEnum,
} = require("@aps_sdk/oss");
const {
    ModelDerivativeClient,
    View,
    Type,
} = require("@aps_sdk/model-derivative");
const {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_BUCKET,
} = require("../config.js");

const sdk = SdkManagerBuilder.create().build();
const authenticationClient = new AuthenticationClient(sdk);
const ossClient = new OssClient(sdk);
const modelDerivativeClient = new ModelDerivativeClient(sdk);

const service = (module.exports = {});

service.getInternalToken = async () => {
    const credentials = await authenticationClient.getTwoLeggedToken(
        APS_CLIENT_ID,
        APS_CLIENT_SECRET,
        [
            Scopes.DataRead,
            Scopes.DataCreate,
            Scopes.DataWrite,
            Scopes.BucketCreate,
            Scopes.BucketRead,
        ]
    );
    return credentials;
};

service.getPublicToken = async () => {
    const credentials = await authenticationClient.getTwoLeggedToken(
        APS_CLIENT_ID,
        APS_CLIENT_SECRET,
        [Scopes.DataRead]
    );
    return credentials;
};

service.ensureBucketExists = async (bucketKey) => {
    const { access_token } = await service.getInternalToken();
    try {
        await ossClient.getBucketDetails(access_token, bucketKey);
    } catch (err) {
        if (err.axiosError.response.status === 404) {
            await ossClient.createBucket(
                access_token,
                CreateBucketXAdsRegionEnum.Us,
                {
                    bucketKey,
                    policyKey: CreateBucketsPayloadPolicyKeyEnum.Persistent,
                }
            );
        } else {
            throw err;
        }
    }
};

service.listObjects = async () => {
    await service.ensureBucketExists(APS_BUCKET);
    const { access_token } = await service.getInternalToken();
    let resp = await ossClient.getObjects(access_token, APS_BUCKET, { limit: 64 });
    let objects = resp.items;
    while (resp.next) {
        const startAt = new URL(resp.next).searchParams.get('startAt');
        resp = await ossClient.getObjects(access_token, APS_BUCKET, { limit: 64, startAt });
        objects = objects.concat(resp.items);
    }
    return objects;
}

service.uploadObjects = async (objectName, filePath) => {
    await service.ensureBucketExists(APS_BUCKET);
    const { access_token } = await service.getInternalToken();
    const obj = await ossClient.upload(APS_BUCKET, objectName, filePath, access_token);
    return obj;
}