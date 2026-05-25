import axios from "axios";

// API key for the content API gateway (shared by Veeva approved-documents and
// get_claims endpoints — both hit the same 9kadvwq6mj execute-api host).
// Defined in .env as REACT_APP_CONTENT_API_KEY. The .env file MUST be added
// to .gitignore before pushing this repo to GitHub — see README/.env.example.
const API_KEY = process.env.REACT_APP_CONTENT_API_KEY;

const getveevaData = () => {
    let sessionUrl = "https://9kadvwq6mj.execute-api.us-east-1.amazonaws.com/list_approved_documents";
    return axios.get(sessionUrl, {
        headers: {
            "X-API-KEY": API_KEY,
            "Content-Type": "application/json"
        }
    })
    .catch(function (error) {
      console.log("Error in getting veeva Data");
      console.log(error);
    });
  }

const getClaimsData = () => {
    let sessionUrl = "https://9kadvwq6mj.execute-api.us-east-1.amazonaws.com/get_claims";
    return axios.get(sessionUrl, {
        headers: {
            "X-API-KEY": API_KEY,
            "Content-Type": "application/json"
        }
    })
    .catch(function (error) {
      console.log("Error in getting claims Data");
      console.log(error);
    });
  }

  export { getveevaData, getClaimsData }

  /*return axios.get(sessionUrl,{headers: {
            "X-API-KEY": API_KEY,
            "Content-Type": "application/json"
        }}
    )*/