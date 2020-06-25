const axios = require('axios');

const config = {
    headers: { Authorization: '$BEARER', Accept: 'application/json' }
};

async function gatherAllEvents(homeInventory, typeName, homeId) {
    const nyceData = await requestNyce(homeId)
    var allHomeData = nyceData
    var tempData
    var tempKey
    for(var key in typeName) {
        var list = typeName[key]
        for(var itemId in list) {
            tempData = await requestDeviceEvents(list[itemId], key)
            if(tempData != null) {
                tempKey = key+list[itemId]
                allHomeData[tempKey] = tempData[list[itemId]]
            }
        }
    }
    console.log(allHomeData)
    
}

async function requestDeviceEvents(deviceId, deviceName) {
    var events
    if(deviceName == 'Scale') {
        events = await requestScale(deviceId);
    } else if (deviceName == 'MedTracker') {
        events = await requestMedTracker(deviceId);
    } else if (deviceName == 'Bedmat') {
        events = await requestBedmat(deviceId);
    } else { 
        events = -1
    }
    return events
}
// inventoryDevices('1614', '1928')

module.exports = async function inventoryDevices(homeId, subjectId) {
    const [firstResponse, secondResponse] = await Promise.all([
        axios.get(`https://juno.orcatech.org/apis/orcatech/v0.9/subjects/${subjectId}/inventory`, config),
        axios.get(`https://juno.orcatech.org/apis/orcatech/v0.9/homes/${homeId}/inventory`, config)
      ]);
    var homeInventory = {}
    var typeName = {}
    var currItem
    firstResponse.data.forEach((res) => {
        homeInventory[res.itemid] = res.itemname
        currItem = res
        if (typeName[currItem.typename] != null) {
            typeName[currItem.typename].push(currItem.itemid)
        } else {
            typeName[currItem.typename] = [currItem.itemid]
        }
    });
    secondResponse.data.forEach((res) => {
        currItem = res.item
        homeInventory[currItem.itemid] = currItem.itemname
        if (typeName[currItem.typename] != null) {
            typeName[currItem.typename].push(currItem.itemid)
        } else {
            typeName[currItem.typename] = [currItem.itemid]
        }
    });
    gatherAllEvents(homeInventory, typeName, homeId);
}

// Request BedMat Data 
// Currenly only able to retrieve all bed mat data
//requestBedmat('22033')
async function requestBedmat(bedmatId) {
    var deviceEvents =  'from, to, duration, fromgmtoffset, durationInBed, durationAwake, durationInRem, durationInLight, durationInDeep, durationSleepOnset, durationBedExit, awakenings, bedExitCount, tossnTurnCount, avgHR, minHR, maxHR, hrvlf, hrvhr, avgrr, minrr, maxrr, avgActivity, fmCount, sleepScore\n'
    var deviceDict = {}
    var response
    try {
        response = await axios.get(
            `https://juno.orcatech.org/apis/orcatech/v0.9/items/bedmats/${bedmatId}/summary`,
            config
        )
    }catch(err) {
        return -1;
    }
    var temp
    response.data.forEach((datum) => {
        for(var key in datum) {
            temp = datum[key]
            if(key != 'sleepscore') { temp += ','}
            deviceEvents += temp
        }
        deviceEvents +='\n'
    })
    deviceDict[bedmatId] = deviceEvents
    return deviceDict
}

// requestMedTracker(20238);
//Get Medication Tracker Info
// Currently limited to ten
// TODO:: Also decipher event meanings, Error catching
async function requestMedTracker(medtrackerID) {
    var deviceEvents = 'Timestamp, Event\n'
    var deviceDict = {}
    var response
    try{
        response = await axios.get( 
            `https://juno.orcatech.org/apis/orcatech/v0.9/items/medtrackers/${medtrackerID}/events?skip=0&limit=10`,
            config
        )
    }catch(err) {
        return -1;
    }
    response.data.forEach((datum) => {
        deviceEvents += datum.stamp + ',' + datum.event + '\n'
    })
    deviceDict[medtrackerID] = deviceEvents
    return deviceDict

        
}
// Get Motion Data
// Currently limited to ten events
async function requestNyce(homeId) {
    var response
    try{
        response = await axios.get( 
            `https://juno.orcatech.org/apis/orcatech/v0.9/homes/${homeId}/nyce/events?skip=0&limit=10`,
            config
            )
    }catch(err) {
        return -1;
    }
    return handleNyceData(response.data);

}
function handleNyceData(data) {
    // Input : Nyce JSON data
    // Output : Device List, Dictionary, CSV events
    // TODO:: Currently doesn't alter the 48/49 Nyce Spec event ouput to 1/0 binary motion
    var deviceList = [];
    var deviceDict = {};
    var deviceName;
    var deviceEvents
    data.forEach((datum) => {
        deviceName = datum.itemname
        deviceEvents = 'Timestamp,Event\n';
        datum.events.forEach((event) => {
            deviceEvents += event.stamp + ',' + event.event + '\n';
        })
        deviceDict[deviceName] = deviceEvents
        deviceList.push(deviceName)
    })
    return deviceDict
}




//requestScale('WS156')
// Get Scale Data
async function requestScale(scaleID) {
    // Current limits to 25 past 
    var deviceDict = {};
    var response
    try {
        response = await axios.get( 
            `https://juno.orcatech.org/apis/orcatech/v0.9/items/scales/${scaleID}/weights?skip=0&limit=25`,
            config
        )
    }catch(err) {
        return -1;
    }
    
    var data = response.data
    var csv = 'Timestamp,Grams\n';
    data.forEach(function(datum) {
        if(datum.weight != null){
            csv += datum.stamp + ',' + datum.weight + '\n'
        }
    })
    deviceDict[scaleID] = csv
    return deviceDict
}
