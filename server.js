require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

let API_BASE = "";
// const API_BASE = "https://stxus.pp-ws.secutix.com/tnci/backend-apis/externalAccessControlService";
// const institution = "stxus";
// const partner = "STXUS";
// const operator = "STXUS_OUDB";
// const secretKey = process.env.SECRET_KEY;

// Function to generate JWT
function createJWT(institution, operator, password) {
    const secretKey = password || process.env.SECRET_KEY;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 900;
    // const exp = iat + 90;
    const payload = { sub: institution, aud: operator, iss: institution, exp, iat };

    return jwt.sign(payload, secretKey, { algorithm: 'HS256' });
}

// const tokenJWT = createJWT();
// console.log(tokenJWT);

// Create the Environment Credentials
app.post("/api/submit-environment", (req, res) => {
    const { institution, operator, password, environment } = req.body;

    if (!institution || !operator || !password || !environment) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("Received Institution:", institution);
    console.log("Received Operator:", operator);
    console.log("Received Password:", password);
    console.log("Selected Environment:", environment);

    API_BASE = `https://${institution.toLowerCase()}.${environment}-ws.secutix.com/tnci/backend-apis/externalAccessControlService`;
    console.log("Updated API_BASE:", API_BASE);

    const token = req.query.token;

    if (token) {
        console.log("Using existing token:", token);
        return res.status(200).json({
            message: "Using existing token",
            token: token
        });
    }

    const jwtToken = createJWT(institution, operator, password);
    console.log("Generated JWT:", jwtToken);

    return res.status(200).json({
        message: "Environment submitted successfully",
        token: jwtToken
    });
});

app.get('/api/checkConnection', async (req, res) => {
    if (!API_BASE) {
        return res.status(500).json({ error: "API_BASE is not set. Select an environment first." });
    }

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }

    try {
        const response = await axios.post(`${API_BASE}/v1_6/getTimeZone`, {
            requestId: 0
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Successful Connection to API");
    } catch (error) {
        console.error("Failure to Connect to API:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// **Route to fetch seasons**
app.get('/api/seasons', async (req, res) => {
    // const token = tokenJWT;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }

    try {
        const response = await axios.post(`${API_BASE}/v1_6/getAccessControlCatalog`, {
            requestId: 0
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Successful Seasons Displayed");
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// **Route to fetch products dynamically based on season**
app.get('/api/products', async (req, res) => {
    const { seasonCode } = req.query;
    if (!seasonCode) {
        return res.status(400).json({ error: "Missing seasonCode parameter" });
    }

    // const token = tokenJWT;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }

    try {
        const response = await axios.post(`${API_BASE}/v1_6/getAccessControlCatalog`, {
            requestId: 0,
            seasonCode: seasonCode
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Successful Events Displayed");
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// **Route to fetch the Valid and Invalid tickets / Made dynamic **
app.get('/api/tickets', async (req, res) => {
    const { seasonCode, eventCode, environmentCode } = req.query;
    if (!seasonCode && !eventCode && !environmentCode) {
        return res.status(400).json({ error: "Missing seasonCode parameter" });
    }

    const productCodes = Array.isArray(eventCode) ? eventCode : [eventCode];

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }
    try {
        const response = await axios.post(`${API_BASE}/v1_6/exportList`, {
            // listType: "GREY",
            listType: environmentCode,
            ticketType: "ALL",
            // seasonCode: "CBPLSS",
            seasonCode: seasonCode,
            productCodes: productCodes,
            nbMaxResults: "10"
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Successful Tickets Displayed");
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// **Route to fetch to see the Controlled Ticket on request / Made dynamic **
app.get('/api/isControlled', async (req, res) => {
    const { barcode } = req.query;
    if (!barcode) {
        return res.status(400).json({ error: "Missing barcode parameter" });
    }

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }

    try {
        const response = await axios.post(`${API_BASE}/v1_6/getControlledTicket`, {
            barCodeOrTaxNumber: barcode
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Successful Tickets Displayed");
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
});

// **Route to submit barcode**
app.post('/api/submit-barcode', async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ error: "Barcode is required" });

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }
    try {
        const response = await axios.post(`${API_BASE}/v1_6/importControlledTicket`, {
            requestId: "1",
            controlledTickets: [{
                acIdentifier: "20190404125800",
                barcode: barcode,
                controlDate: new Date().toISOString(),
                controlResult: "OK",
                failureReason: "OK"
            }]
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Successful Controlled Ticket");
    } catch (error) {
        console.error("Error submitting barcode:", error);
        res.status(500).json({ error: "Failed to submit barcode" });
    }
});

// Route to burn a ticket
app.get('/api/burnTicket', async (req, res) => {
    const { barcode } = req.query;
    if (!barcode) return res.status(400).json({ error: "Barcode is required" });

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }

    try {
        const response = await axios.post(`${API_BASE}/v1_6/burnTicket`, {
            requestId: 0,
            barCodeOrTaxNumber: barcode
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Burn Ticket Was a Success");
    } catch (error) {
        console.error("Error burning ticket:", error);
        res.status(500).json({ error: "Failed to burn ticket" });
    }
});

// Route to Control a ticket
app.get('/api/controlTicket', async (req, res) => {
    const { barcode } = req.query;
    if (!barcode) return res.status(400).json({ error: "Barcode is required" });

    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized: No JWT Token Provided" });
    }

    try {
        const response = await axios.post(`${API_BASE}/v1_6/importControlledTicket`, {
            requestId: "1",
            controlledTickets: [{
                acIdentifier: "20190404125800",
                barcode: barcode,
                controlDate: new Date().toISOString(),
                controlResult: "OK",
                failureReason: "OK"
            }]
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        res.json(response.data);
        console.log("Control Ticket Was a Success");
    } catch (error) {
        console.error("Error Controlling ticket:", error);
        res.status(500).json({ error: "Failed to Control ticket" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
