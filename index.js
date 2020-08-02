// Import for request making
const https = require('https');

// Import for Dynamo DB
const AWS = require('aws-sdk');

// DDB Client Call
const ddb = new AWS.DynamoDB.DocumentClient();

// Actual Response 
exports.handler = async (event) => {
  // Holds response 
    let flight = {
      time: Date.now(),
    };
    
    // If there is post data, see what it wants to do 
    if (event.body) {
      let parsed = JSON.parse(event.body);
      if (parsed.reason === "AllCars"){
        let user = await findAccess(parsed.cooks);
        if (user.Item) {
          flight = {...(await getAllCars()), ...flight};
        }
        else {
          flight.reload = true;
        }
      }
      else {
        flight = {...(await genResp(parsed)), ...flight};
      }
    }
    else {
        flight.code = false;
        flight.message = JSON.stringify("No Post Body Found");
    }
    
    
    // Define and send the actual return packet
    const response = {
        statusCode: 200,
        body: JSON.stringify(flight),
    };
    return response;
};

// Returns a promise of the respose from the website 
function doRequest(website) {
  return new Promise((resolve, reject) => {
    const req = https.get(website, (response) => {
        let todo = '';
      
        response.on('data', (chunk) => {
          todo += chunk;
        });
      
        response.on('end', () => {
          resolve(todo);
        });
      
      }).on("error", (error) => {
        resolve("Error: " + error.message);
      });
  });
}

// Returns a promise to return the rower
function getRower(name) {
    return ddb.get({
        TableName: 'Rowers',
        Key: {
            CaseId: name,
        },
    }).promise();
}

// Gets the unix Epoch time for an hour from now
function getHourTime() {
  let time = 60;
  return (Math.floor(new Date()/1000) + time * 60);
}

// Create a random sized string based on param 
function createCook(size) {
  let s = ""; 
  let i = 0;
  while (i < size) {
    let val = Math.floor(Math.random() * 15);
    if (val < 10) {
      s += val.toString();
    }
    else{
      s += String.fromCharCode(55 + val);
    }
    i += 1;
  }
  return s;
}

// Adds a user cookie paring to the db along with an expiration time
function addAccess(cooks, user) {
    return ddb.put({
        TableName: 'Access',
        Item: {
            Cooks: cooks,
            user: user,
            time: getHourTime(),
        },
    }).promise();
}

// See if cookie passed to us is accounted for 
function findAccess(cooks) {
  return ddb.get({
        TableName: 'Access',
        Key: {
            Cooks: cooks,
        },
    }).promise();
}

// Gets the car from a car ID
function getCar(carID) {
  return ddb.get({
        TableName: 'Cars',
        Key: {
            carID: carID,
        },
    }).promise()
}

// Returns the object that holds all information about a car 
function getCarTable(car) {
  let carPassengers = [];
  if(car.Item.passengers){
    for(let i = 1; i <= car.Item.passengers; i += 1){
      let loc = `loc${i}`;
      let pass = `name${i}`;
      let time = `time${i}`;
      let rider = {
        name: car.Item[pass],
        location: car.Item[loc],
        time: car.Item[time]
      };
      carPassengers.push(rider);
    }
  }
  let carTable = {
    driver: car.Item.driverName,
    driverID: car.Item.driver,
    vehicle: car.Item.car,
    passengers: carPassengers,
  };
  return carTable;
}

// Generate generic response 
async function genResp(parsed) {
  let flight = {};
  let needAuth = true;
  if (parsed.cooks) {
    let sess = await findAccess(parsed.cooks);
    // Check is listed cookie exists and is valid
    if (sess.Item) {
      needAuth = false; 
      flight.message = "Session Found Valid";
      let rower = await getRower(sess.Item.user);
      flight.caseid = sess.Item.user;
      flight.cooks = parsed.cooks;
      if(rower.Item){
        flight.name = rower.Item.name; 
        let car = await getCar(rower.Item.carID);
        flight.car = getCarTable(car);
      }
      else {
        flight.debug = "Case ID not in DDB";
      }
      flight.code = true;
    }
    // otherwise return no cookie found 
    else {
      flight.debug = "Cookie not found";
      flight.oldCook = parsed.cooks;
    }
  }
  
  
  if(needAuth) {
    if(parsed.ticket && parsed.service) {
      // locally define vars
      let ticket = parsed.ticket;
      let service = parsed.service;
      
      let resp = "";
      // Before we check the ticket, see if it was even provided 
      if (ticket.length > 2) {
        // Query Case Authentication Site 
        let website = `https://login.case.edu/cas/validate?ticket=${ticket}&service=${service}`;
        resp = (await doRequest(website)).toString();
      }
      else {
        resp = "no";
      }
      
      // If they are logged in...
      if (resp.includes("yes")) {
        // Query the rower ddb for the rower
        let caseid = resp.substring(4, resp.length-1);
        let rower = await getRower(resp.substring(4, resp.length-1));
        flight.caseid = caseid;
        if(rower.Item){
          flight.name = rower.Item.name; 
          let car = await getCar(rower.Item.carID);
          flight.car = getCarTable(car);
        }
        else {
          flight.name = caseid;
          flight.debug = "Case ID not in DDB";
        }
        flight.code = true;
        let cooks = createCook(18);
        flight.cooks = cooks;
        await addAccess(cooks, caseid);
      }
      else {
        flight.reload = true;
        flight.code = false;
        flight.message = "Ticket Not Valid";
      }
    }
    else {
      flight.reload = true;
      flight.code = false;
      flight.message = "Not enough valid information";
    }
  }
  return flight;
}

// Gets all cars
function getAllCars() {
  return ddb.scan({
        TableName: 'Cars',
    }).promise();
}
