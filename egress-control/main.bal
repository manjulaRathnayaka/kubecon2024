import ballerina/http;
import ballerina/log;

configurable string host = "https://postman-echo.com";
public function main() returns error? {
     http:Client postmanEchoClient = check new (host, {
            timeout: 2000 // Set timeout in milliseconds
        });

        // Try making the HTTP GET request
        http:Response|error response = postmanEchoClient->get("/get");

        if (response is http:Response) {
            // Log the response details
            log:printInfo(check response.getTextPayload());
        } else {
            // Handle the error (e.g., connection timeout or other errors)
            if (response is http:ClientError) {
                log:printError("Client error occurred.", response);
            } else {
                log:printError("Unknown error occurred.", response);
            }
        }

}
