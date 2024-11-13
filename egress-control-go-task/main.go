package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

func main() {
	// Set up HTTP client with timeout
	client := &http.Client{
		Timeout: 5 * time.Second, // Set timeout to 5 seconds
	}

	// Define the request URL
	url := "https://postman-echo.com/get"

	// Make the HTTP GET request
	response, err := client.Get(url)

	// Handle errors such as timeouts or connection failures
	if err != nil {
		log.Printf("Error occurred while making the request: %v", err)
		return
	}
	defer response.Body.Close()

	// Log the HTTP status code
	log.Printf("HTTP Status Code: %d", response.StatusCode)

	// Read and log the response body
	body, err := ioutil.ReadAll(response.Body)
	if err != nil {
		log.Printf("Error reading response body: %v", err)
		return
	}
	log.Printf("Response Body: %s", body)

	// Additional handling for specific status codes
	if response.StatusCode != http.StatusOK {
		fmt.Printf("Request failed with status code: %d\n", response.StatusCode)
	} else {
		fmt.Println("Request succeeded!")
	}
}

