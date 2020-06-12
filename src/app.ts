//Controllers
// import * as proxyController from "./controllers/proxy";

import { Config } from "./Config";
const { Client } = require("pg");
import axios, { AxiosRequestConfig, AxiosPromise } from "axios";
import { MapObjectDataStructure, Navlink } from "@mapcreator/lib-core";
import * as zlib from "zlib";
//export app as module
import { DecodedJSON, LambdaEvent } from "./interfaces/LambdaEvents";
import { LambdaContext, LambdaCallback } from "./interfaces/Lambda";
import { HRTimeStat } from "./interfaces/Common";
import { v_SpeedLimitCategory_Result, m_SpeedLimitCategory_Result } from "./interfaces/QueryResults";
import { navlinkConverter } from "./services/ServiceInstance";

const env_config = Config.all();
const data_config = {
	ruleId: "NAVLINK_PROPERTY_SPEEDLIMIT_LARGE_DIFF_SPEEDCAT",
	testDataTag: "batch_violation_maptask_creator",
	rowLimit: -1,
	// rowLimit: -1,
	upload: {
		batchSize: 1000,
		concurrency: 5,
	},
	delete: {
		batchSize: 200,
		concurrency: 10,
	},
};

let monitor: { [key: string]: Partial<HRTimeStat> } = {
	query: {},
	maptaskQuery: {},
	processing: {},
	delete: {},
	upload: {},
	total: {},
};

let arrIsocc = new Map<string, number>();
let maptaskIDs = new Map<string, boolean>();

async function getMapTaskFromDB(): Promise<m_SpeedLimitCategory_Result[]> {
	monitor.maptaskQuery.start = process.hrtime();
	const query = `SELECT 
            jsondata->>'id' AS ID
            --, geojson
        FROM sourcing."${env_config["spaces.maptask"]}"
        WHERE 
        jsondata->'properties'->'@ns:com:here:xyz'->'tags' @> '["${
			data_config.testDataTag
		}", "reference_violation_${data_config.ruleId.toLowerCase()}"]'
    `;

	const maptaskDBConfig = Config.get("mapTaskDB");
	// console.log(query);

	const client = new Client(maptaskDBConfig);

	return new Promise((resolve, reject) => {
		client.connect();

		client.query(query, (err: any, res: { rows: m_SpeedLimitCategory_Result[] }) => {
			monitor.maptaskQuery.end = process.hrtime(monitor.maptaskQuery.start);

			if (err) {
				console.error(err);
				client.end();
				return reject(err);
			}
			client.end();

			res.rows.forEach(row => {
				maptaskIDs.set(row.id, true);
			});
			console.log("Maptask Total Rows: ", maptaskIDs.size);

			return resolve(res.rows);
		});
	});
}

async function readViolationFromDB(): Promise<v_SpeedLimitCategory_Result[]> {
	monitor.query.start = process.hrtime();

	const query = `WITH cte_road_violation AS (
		SELECT
				 jsondata->>'id' AS id,
				 jsondata->'properties'->'@ns:com:here:xyz'->>'updatedAt' AS updatedAt,
		   --    each_violation->'id' AS v_id,
				 each_violation AS v_jsondata
		   FROM 
			   -- here_livemap."${env_config["spaces.road"].violation}"
			   (
				   SELECT 
					   jsondata 
				   FROM here_livemap."${env_config["spaces.road"].violation}"
				   WHERE jsondata->'properties'->'@ns:com:here:xyz'->'tags' @> '["${data_config.ruleId.toLowerCase()}"]'
			   ) A
		   CROSS JOIN jsonb_array_elements(jsondata->'properties'->'violations') each_violation
		   WHERE
			   each_violation->'properties'->>'ruleId' = '${data_config.ruleId}'
			   ${data_config.rowLimit === -1 ? "" : "LIMIT " + data_config.rowLimit}
   )
    
    SELECT
        r1.id
    --	, r1.v_id
        , r1.updatedAt
        , r1.v_jsondata
        
    --	, r2.id AS o_id
        , r2.jsondata AS o_jsondata
        , r2.geojson AS o_geojson
     FROM cte_road_violation AS r1
	 LEFT JOIN
	 here_livemap."${env_config["spaces.road"].base}" AS r2
        
     ON
         (r1.id) = (r2.jsondata->>'id')`;

	const violationDBConfig = Config.get("violationDB");
	// console.log(query);

	const client = new Client(violationDBConfig);

	return new Promise((resolve, reject) => {
		client.connect();

		client.query(query, (err: any, res: { rows: v_SpeedLimitCategory_Result[] }) => {
			monitor.query.end = process.hrtime(monitor.query.start);

			if (err) {
				console.error(err);
				client.end();
				return reject(err);
			}
			console.log("Violation Total Rows: ", res.rows.length);

			res.rows.forEach(row => {
				row.o_jsondata.geometry = row.o_geojson;
			});

			client.end();
			return resolve(res.rows);
		});
	});
}

const convertToMapTask = (dbResult: v_SpeedLimitCategory_Result[]) => {
	monitor.processing.start = process.hrtime();

	const speedCatMapping = {
		"1": "> 130 km/h / 80 MPH",
		"2": "< 130 km/h / 80 MPH",
		"3": "< 100 km/h / 64 MPH",
		"4": "< 90 km/h / 54 MPH",
		"5": "< 70 km/h / 40 MPH",
		"6": "< 50 km/h / 30 MPH",
		"7": "< 30 km/h / 20 MPH",
		"8": "< 11 km/h / 6 MPH",
	};
	const createMapTask = (dbRow: v_SpeedLimitCategory_Result) => {
		const feature_id = dbRow.id;
		const roadObj = dbRow.o_jsondata;
		const sourceFeature = navlinkConverter.asSourceFeature(roadObj);
		const navlinkObj = navlinkConverter.convertFromSource(sourceFeature!);
		if (!navlinkObj) return;

		const obj_prop = roadObj.properties;
		const featureType = navlinkObj.featureType;
		const feature_space = obj_prop["@ns:com:here:xyz"] ? obj_prop["@ns:com:here:xyz"].space : "";
		const roadName = Navlink.getRoadName(navlinkObj) || "Unnamed road";
		const speedCategory = speedCatMapping[obj_prop.speedCategory];
		const isocc = Navlink.getIsoCountryCode(navlinkObj);

		const coordinates = roadObj.geometry.coordinates;
		const centerCoord =
			dbRow.v_jsondata.geometry.type === "Point"
				? dbRow.v_jsondata.geometry.coordinates
				: coordinates[Math.floor(coordinates.length / 2)];

		const toLimit = Navlink.getSpeedLimit(navlinkObj, "TO");
		const fromLimit = Navlink.getSpeedLimit(navlinkObj, "FROM");
		let speedLimitDisplay = "";
		if (toLimit.value) speedLimitDisplay += ` TO: ${toLimit.value || 0} ${toLimit.unit}`;
		if (fromLimit.value) speedLimitDisplay += ` FROM: ${fromLimit.value || 0} ${fromLimit.unit}`;

		const mtFeature = {
			type: "Feature",
			properties: {
				status: "OPEN",
				devices: ["WEB"],
				options: [
					{
						key: "yes",
						value: [
							{
								lang: "en",
								text: "Yes – Updated",
							},
						],
					},
					{
						key: "no",
						value: [
							{
								lang: "en",
								text: "No – Looks good",
							},
						],
					},
					{
						key: "dont know",
						actions: ["IGNORE"],
						value: [
							{
								lang: "en",
								text: "I'm not sure",
							},
						],
					},
				],
				headline: [
					{
						lang: "en",
						text: `Please verify, that the avg. speed of ${roadName} is ${speedCategory}`,
					},
				],
				language: ["en"],
				priority: 63, /// Check what to put
				taskType: "CHOICE",
				audiences: ["EXTERNAL"],
				responses: [],
				references: [
					{
						ids: [feature_id],
						spaceId: feature_space,
						featureType: featureType,
					},
				],
				assignments: [],
				description: [
					{
						lang: "en",
						text:
							"Looks like the speed category **" +
							speedCategory +
							"** doesn't fit for this road. " +
							"Can you please check and change the properties of this road to make it fit better to the speed limit?",
					},
				],
				featureType: "MapTask",
				isoCountryCode: isocc.toUpperCase(),
				"@ns:com:here:mom:meta": {
					createdTS: new Date().toISOString(),
					modelVersion: "1.6.0",
					// "sourceId": "?"
				},
				"@ns:com:here:xyz": {
					tags: [
						"isocc_" + isocc.toLowerCase(),
						"tasktype_choice", // task-type
						"status_open",
						"audience_external",
						// "audience_internal",
						"device_web",
						"unassigned",
						"no_campaign",
						"reference_violation",
						"reference_" + featureType.toLowerCase(),
						"reference_" + featureType.toLowerCase() + "_" + feature_id,
						// "reference_violation_<id>",
						"reference_violation_" + data_config.ruleId.toLowerCase(),
						"lang_en",
						data_config.testDataTag,
					],
				},
				numExpectedResponses: 3,
			},
			geometry: {
				type: "Point",
				coordinates: centerCoord,
			},
		};
		let count = (arrIsocc.get(isocc) || 0) + 1;
		arrIsocc.set(isocc, count);
		return mtFeature;
	};

	let uploadFeatures = dbResult.map(createMapTask);
	console.log("Generated Maptasks: %d", uploadFeatures.length);

	monitor.processing.end = process.hrtime(monitor.processing.start);
	return uploadFeatures;
};

// @ts-ignore
const divideInBatch = (array: any[], batchSize: number) => {
	let tempArray = [];

	for (let i = 0; i < array.length; i += batchSize) {
		tempArray.push(array.slice(i, i + batchSize));
	}
	console.log(
		"Divided in %d x %d batches, last batch size %d",
		batchSize,
		tempArray.length,
		tempArray[tempArray.length - 1].length
	);
	return tempArray;
};
const promiseAll = async (
	arrAllPromise: (() => Promise<any>)[],
	concurrency: number,
	onComplete: (resps: any[], errs: any[]) => void
): Promise<{ success: any[]; error: any[] }> => {
	console.log("NETWORK REQUESTS : ");
	let promiseBatches = divideInBatch(arrAllPromise, concurrency);
	let resolveResponse: any[] = [];
	let rejectResponse: any[] = [];
	let c = 0;
	for (const batch of promiseBatches) {
		try {
			console.log("-- sending batch --", ++c);
			const resp = await Promise.all(batch.map(f => f()));
			resolveResponse = resolveResponse.concat(resp);
		} catch (err) {
			// console.error(err)
			rejectResponse = rejectResponse.concat(err);
		}
	}
	onComplete(resolveResponse, rejectResponse);
	return new Promise(resolve => {
		resolve({ success: resolveResponse, error: rejectResponse });
	});
};

const uploadMaptask = async (uploadChunks: any[][]) => {
	// Upload the batches
	monitor.upload.start = process.hrtime();
	try {
		const allUploadPromises = uploadChunks.map((item, index) => {
			return async () => {
				console.log("putOnXYZ %d: %d", index, item.length);
				const resp = await putOnXYZ({
					type: "FeatureCollection",
					features: item,
				});
				console.log("inserted item%d: %d", index, item.length);
				return resp;
			};
		});
		const batchResult = await promiseAll(allUploadPromises, data_config.upload.concurrency, (resp, errs) => {
			console.log("Everything inserted Callback = Success: %d, Error %d", resp.length, errs.length);
			if (errs.length) {
				let failedItems: any[] = [];
				errs.forEach(item => {
					failedItems = failedItems.concat(item.features);
				});
				const failedItemsCount = failedItems.length;

				console.error("Cannot insert %d items", failedItemsCount, failedItems[0]);
			}
		});
		console.log(
			"Everything inserted Promise = Success: %d, Error %d",
			batchResult.success.length,
			batchResult.error.length
		);

		console.log("Upload Successfull");
	} catch (error) {
		console.error("Error in uploading", error);
	}
	monitor.upload.end = process.hrtime(monitor.upload.start);
};
const putOnXYZ = (payload: { type: string; features: any[] }) => {
	return new Promise(async (resolve, reject) => {
		try {
			await axios.put(`https://xyz.api.here.com/hub/spaces/${env_config["spaces.maptask"]}/features`, payload, {
				headers: {
					"Content-Type": "application/geo+json",
					Authorization: `Bearer ${env_config.access_token.maptask}`,
				},
			});
			return resolve(payload);
		} catch (error) {
			return reject(payload);
		}
	});
};
const deleteOnXyz = (ids: string[]) => {
	// console.log("deleteOnXyz", ids.length);
	const requestConfig: AxiosRequestConfig = {
		// params: `id=${ids.join(",")}`,
		headers: {
			// "Content-Type": "application/geo+json",
			Accept: "application/geo+json",
			Authorization: `Bearer ${env_config.access_token.maptask}`,
		},
	};
	const url = `https://xyz.api.here.com/hub/spaces/${env_config["spaces.maptask"]}/features?id=${ids.join(",")}`;

	return new Promise(async (resolve, reject) => {
		try {
			await axios.delete(url, requestConfig);
			resolve(ids);
		} catch (error) {
			reject(ids);
		}
	});
};

const deleteByTags = (tags: string[]) => {
	// const requestConfig: AxiosRequestConfig = {
	// 	params: `tags=${tags.join("+")}`,
	// 	headers: {
	// 		// "Content-Type": "application/geo+json",
	// 		Authorization: `Bearer ${env_config.access_token.maptask}`,
	// 	},
	// 	paramsSerializer: function(params: string) {
	// 		return params;
	// 	},
	// };
	// const url = `https://xyz.api.here.com/hub/spaces/${env_config["spaces.maptask"]}/features`;
	// return axios.delete(url, requestConfig);

	// Generate batch to be deleted
	monitor.delete.start = process.hrtime();

	return new Promise(async (resolve, reject) => {
		if (maptaskIDs.size === 0) {
			console.log("Nothing to delete");
			monitor.delete.end = process.hrtime(monitor.delete.start);
			return resolve();
		} else {
			const arrayToDelete = Array.from(maptaskIDs.keys());
			const toDeleteBatch = divideInBatch(arrayToDelete, data_config.delete.batchSize);

			try {
				let toDeletePromises = toDeleteBatch.map((item, index) => {
					return async () => {
						console.log("deleteOnXyz item%d: size %d", index, item.length);
						const resp = await deleteOnXyz(item);
						console.log("deleted item%d: %d", index, item.length);
						return resp;
					};
				});

				const result = await promiseAll(toDeletePromises, data_config.delete.concurrency, (resp, errs) => {
					console.log("Everything deleted Callback = Success: %d, Error %d", resp.length, errs.length);
					console.log("Sample resp: ", resp[0].join(","), "Sample err", errs[0]);
				});
				console.log(
					"Everything deleted Promise = Success: %d, Error %d",
					result.success.length,
					result.error.length
				);
				console.log("Delete Successfull");
				monitor.delete.end = process.hrtime(monitor.delete.start);
				return resolve();
			} catch (error) {
				console.error("Error in Deleting", error);
				monitor.delete.end = process.hrtime(monitor.delete.start);
				return reject();
			}
		}
	});
};

const displayStats = () => {
	console.log("\n---------------------\n");
	console.log("Execution Stats\n*******************");

	for (let key in monitor) {
		const timeEnd = monitor[key].end || [0, 0];
		console.info(key.toUpperCase().padEnd(20) + ":\t %ds %dms", timeEnd[0], timeEnd[1] / 1000000);
	}

	if (arrIsocc.size) {
		console.info("\nProcessed %d countries", arrIsocc.size);
		console.info("List of countries: ");
		console.table(arrIsocc);
	}
};

module.exports = {
	execute: async (event: LambdaEvent, context: LambdaContext, callback: LambdaCallback) => {
		// const message = event.Records[0].Sns.Message;
		// // console.log("SNS Message", message);

		// const decodedString = zlib.gunzipSync(Buffer.from(message, "base64")).toString();
		// const jsonFeature = JSON.parse(decodedString) as DecodedJSON;

		// // console.log("Decoded by Lambda", jsonFeature.changes[0].feature);
		// console.log("Navlink converter ", Navlink.isNavlink({ featureType: "Road" } as MapObjectDataStructure));

		monitor.total.start = process.hrtime();

		const mtDBResult = await getMapTaskFromDB();

		const [vDBResult, deleteResult] = await Promise.all([
			readViolationFromDB(),
			await deleteByTags([data_config.testDataTag]),
		]);
		displayStats();

		let uploadFeatures = convertToMapTask(vDBResult as v_SpeedLimitCategory_Result[]);

		// console.log("Sample violation Row 0: ", vDBResult[0]);
		// console.log("Sample maptask Row 0: ", mtDBResult[0]);
		// console.log("Sample upload Row 0: ", uploadFeatures[0]);

		const uploadChunks = divideInBatch(uploadFeatures, data_config.upload.batchSize);

		await uploadMaptask(uploadChunks);

		monitor.total.end = process.hrtime(monitor.total.start);

		displayStats();
		return;
	},
};
