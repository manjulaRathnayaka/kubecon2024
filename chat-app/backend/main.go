package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// Models
type ChatGroup struct {
	ID      string             `json:"id"`
	Name    string             `json:"name"`
	Members map[string]bool    `json:"members"` // Set of member user IDs
	Clients map[string]*Client // Active WebSocket connections
}

// User structure
type User struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// WebSocket client structure
type Client struct {
	conn   *websocket.Conn
	userID string
	group  *ChatGroup
}

// In-memory storage
var (
	chatGroups = make(map[string]*ChatGroup) // Map of chat groups
	users      = make(map[string]*User)      // Map of users
	mu         sync.Mutex                    // Mutex for concurrency control
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In a real-world app, perform proper origin checks
		return true
	},
}

// Create a new chat group
func createChatGroup(w http.ResponseWriter, r *http.Request) {
	var group ChatGroup
	err := json.NewDecoder(r.Body).Decode(&group)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	group.Members = make(map[string]bool)    // Initialize members set
	group.Clients = make(map[string]*Client) // Initialize WebSocket clients

	mu.Lock()
	chatGroups[group.ID] = &group
	mu.Unlock()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(group)
}

// Register a new user
func registerUser(w http.ResponseWriter, r *http.Request) {
	var user User
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	mu.Lock()
	users[user.ID] = &user
	mu.Unlock()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// Add a user to a chat group
func addUserToChatGroup(w http.ResponseWriter, r *http.Request) {
	groupID := mux.Vars(r)["groupID"]
	userID := mux.Vars(r)["userID"]

	mu.Lock()
	group, groupExists := chatGroups[groupID]
	_, userExists := users[userID] // Changed 'user' to '_' to avoid unused variable error
	if groupExists && userExists {
		group.Members[userID] = true
		json.NewEncoder(w).Encode(group)
	} else {
		http.Error(w, "Chat group or user not found", http.StatusNotFound)
	}
	mu.Unlock()
}

// Broadcast a message to all WebSocket connections in the group
func broadcastMessage(group *ChatGroup, messageType int, message []byte) {
	mu.Lock()
	defer mu.Unlock()

	for _, client := range group.Clients {
		err := client.conn.WriteMessage(messageType, message)
		if err != nil {
			log.Printf("Error broadcasting to client %s: %v", client.userID, err)
			client.conn.Close()
			delete(group.Clients, client.userID) // Remove disconnected clients
		}
	}
}

// WebSocket handler for real-time messaging
func chatWebSocket(w http.ResponseWriter, r *http.Request) {
	groupID := mux.Vars(r)["groupID"]
	userID := r.URL.Query().Get("userID") // User ID passed as a query param

	mu.Lock()
	group, groupExists := chatGroups[groupID]
	_, userExists := users[userID] // Changed 'user' to '_' to avoid unused variable error
	mu.Unlock()

	if !groupExists || !userExists {
		http.Error(w, "Chat group or user not found", http.StatusNotFound)
		return
	}

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open WebSocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	// Create a new client for the WebSocket connection
	client := &Client{
		conn:   conn,
		userID: userID,
		group:  group,
	}

	mu.Lock()
	group.Clients[userID] = client // Add the client to the group
	mu.Unlock()

	// Listen for messages from the client and broadcast them to the group
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		log.Printf("Message received from user %s in group %s: %s", userID, groupID, string(message))

		// Broadcast the message to the group
		broadcastMessage(group, messageType, message)
	}

	// Clean up when the client disconnects
	mu.Lock()
	delete(group.Clients, userID)
	mu.Unlock()
}

func main() {
	r := mux.NewRouter()

	// Chat group routes
	r.HandleFunc("/groups", createChatGroup).Methods("POST")
	r.HandleFunc("/users", registerUser).Methods("POST")
	r.HandleFunc("/groups/{groupID}/users/{userID}", addUserToChatGroup).Methods("POST")

	// WebSocket route for chatting
	r.HandleFunc("/groups/{groupID}/ws", chatWebSocket)

	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
