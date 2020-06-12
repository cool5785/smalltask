config = {
    violation: {
        "space": "xGBJ0MJG", // Road
        "auth": "AAaVYeyENIyqVX3eJnHl-Eo"
    },
    mapTask: {
        "space": "39ZVK252",
        "auth": "AK-DOoA0pEEWWOoBSKneXjQ"
    },
    howMany: 10000,
    testDataTag: "dummy_test",
    removeOldData: true
};
violation_rulecode = "COM024";

uploadData = {
    "type": "FeatureCollection",
    "features": []
};

fetchAsync = async (url) => {
    let response = await fetch(url);
    return await response.json();
};
arrIsocc = [];
convertToMapTask = (vObj) => {
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

    const feature_id = vObj.id;
    const vObj_mom = vObj.properties.mom || vObj.properties.uom;
    const featureType = vObj_mom.featureType;
    const feature_space = vObj_mom["@ns:com:here:xyz"].space;
    const roadName = vObj_mom.roads && vObj_mom.roads[0] &&
                        vObj_mom.roads[0].roadName && vObj_mom.roads[0].roadName.name
                    ? vObj_mom.roads[0].roadName.name : "Unnamed road";
    const speedCategory = speedCatMapping[vObj_mom.speedCategory];
    const isocc = vObj_mom.isoCountryCode;
    const coordinates = vObj.geometry.coordinates;
    const centerCoord = vObj.geometry.type === "Point" ? coordinates : coordinates[Math.floor(coordinates.length/2)];

    let mtFeature = {
        "type": "Feature",
        "properties": {
            "status": "OPEN",
            "devices": [
                "WEB"
            ],
            "options": [
                {
                    "key": "yes",
                    "value": [
                        {
                            "lang": "en",
                            "text":"Yes – Updated"
                        }
                    ]
                },
                {
                    "key": "no",
                    "value": [
                        {
                            "lang": "en",
                            "text":"No – Looks good"
                        }
                    ]
                },
                {
                    "key": "dont know",
                    "actions":['IGNORE'],
                    "value": [
                        {
                            "lang": "en",
                            "text":"I'm not sure"
                        }
                    ]
                }

            ],
            "headline": [
                {
                    "lang": "en",
                    "text": "Please check avg. speed of " + roadName
                }
            ],
            "language": [
                "en"
            ],
            "priority": 63, /// Check what to put
            "taskType": "CHOICE",
            "audiences": [
                "EXTERNAL"
            ],
            "responses": [

            ],
            "references": [
                {
                    "ids": [
                        feature_id
                    ],
                    "spaceId": feature_space,
                    "featureType": featureType
                }
            ],
            "assignments": [

            ],
            "description": [
                {
                    "lang": "en",
                    "text": "Looks like the speed category **"+ speedCategory +"** doesn't fit for this road. " +
                        "Can you please check and change the properties of this road to make it fit better (e.g. the speed category)"
                }
            ],
            "featureType": "MapTask",
            "isoCountryCode": isocc.toUpperCase(),
            "@ns:com:here:mom:meta": {
                "createdTS": new Date().toISOString(),
                "modelVersion": "1.6.0",
                // "sourceId": "?"
            },
            "@ns:com:here:xyz": {
                "tags": [
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
                    "reference_"+ featureType.toLowerCase() +"_" + feature_id,
                    // "reference_violation_<id>",
                    "reference_violation_" + violation_rulecode,
                    "lang_en",
                    config.testDataTag,
                ]
            },
            "numExpectedResponses": 3
        },
        "geometry": {
            "type": "Point",
            "coordinates": centerCoord
        }
    };
    arrIsocc.push(isocc);
    uploadData.features.push(mtFeature);
};

deleteById = async (id) => {
    return await fetch("https://xyz.api.here.com/hub/spaces/" + config.mapTask.space + "/features?id=" + id, {
        headers: {
            Accept: "application/geo+json",
            Authorization: "Bearer " + config.mapTask.auth,
        },
        body: null,
        method: "DELETE",
    });
};

deleteAll = async() => {
    /// Get all data and iterate over it to delete
    const mtData = await fetchAsync("https://xyz.api.here.com/hub/spaces/" + config.mapTask.space
                + "/search?access_token=" + config.mapTask.auth
                + "&tags=" + config.testDataTag + "+reference_violation_" + violation_rulecode);
    mtData.features.forEach((mt) => {
        deleteById(mt.id);
    });
    console.log("Data Deleted");
};
processAll = async() => {
    console.time("Sab kaam ho gaya");

    const vData = await fetchAsync("https://xyz.api.here.com/hub/spaces/" + config.violation.space +"/search?" +
        "access_token=" + config.violation.auth +
        "&tags=" + violation_rulecode +
        "&limit=" + config.howMany);
    console.log("Got Violations ", vData.features.length);
    vData.features.forEach((vObj) => {
        convertToMapTask(vObj);
    });
    console.log("Converted all to MapTasks", uploadData);

    if(config.removeOldData) {
        await deleteAll();
    }

    const dataInserted = await fetch("https://xyz.api.here.com/hub/spaces/" + config.mapTask.space + "/features", {
        headers: {
            accept: "application/geo+json",
            authorization: "Bearer " + config.mapTask.auth,
            "content-type": "application/geo+json",
        },
        body: JSON.stringify(uploadData),
        method: "PUT"
    });
    console.timeEnd("Sab kaam ho gaya");
};

processAll();