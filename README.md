# Vibe Code Game - Character Animation Demo

This project is a simple Phaser 3 demonstration of an 8-directional animated character. It includes idle, walking, and running animations controlled by keyboard input.

## Prerequisites

To run this game, you will need a modern web browser and a way to serve the files locally. The easiest way is to use a simple local web server.

## Running the Game

You can use any local web server. Here are two common, easy options.

### Option 1: Using `npx` (Requires Node.js)

This is the recommended method if you have Node.js installed. It runs a local server without you having to install any packages globally.

1.  Open your terminal in the project directory.
2.  Run the following command:
    ```bash
    npx http-server
    ```
3.  Open your web browser and navigate to the local address shown in the terminal (usually `http://127.0.0.1:8080` or `http://localhost:8080`).

### Option 2: Using Python

If you have Python installed, you can use its built-in simple HTTP server.

1.  Open your terminal in the project directory.
2.  Run one of the following commands, depending on your Python version:

    **For Python 3:**
    ```bash
    python3 -m http.server
    ```

    **For Python 2:**
    ```bash
    python -m SimpleHTTPServer
    ```
3.  Open your web browser and navigate to `http://localhost:8000`.

## Controls

*   **Arrow Keys**: Move the character.
*   **Diagonal Movement**: Press two arrow keys at once (e.g., Up + Left).
*   **Run**: Hold down the **Space Bar** while moving. 

Additional controls to be added.