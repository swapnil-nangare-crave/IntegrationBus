# Integration Bus

This is a Node.js application that provides a service for generating and deploying SAP Cloud Platform Integration (CPI) iFlows.

## Overview

The application is an Express.js server that exposes API endpoints to:
1.  Generate a deployable SAP CPI iFlow artifact (as a `.zip` file) from a JSON representation of an integration flow.
2.  Migrate/deploy the generated artifact to a specified SAP CPI tenant.

It uses predefined XML templates for various CPI components and dynamically constructs the final iFlow XML based on the provided JSON input.

## Features

-   **iFlow Generation:** Dynamically creates iFlow XML (`.iflw`) from a JSON definition.
-   **Project Structure Creation:** Builds the standard SAP CPI project structure, including the `META-INF` and `src` directories.
-   **Packaging:** Bundles the iFlow and all necessary resources (scripts, mappings, schemas) into a single `.zip` file ready for deployment.
-   **Artifact Deployment:** Provides an endpoint to deploy the artifact to a CPI tenant using OAuth 2.0 authentication.

## API Endpoints

### `POST /get-iflow-zip`

This endpoint generates and returns a `.zip` file containing the SAP CPI iFlow artifact.

-   **Request Body:** A JSON object that defines the structure and components of the integration flow. This includes senders, receivers, flow steps, scripts, mappings, etc.
-   **Response:** A `.zip` file attachment containing the complete iFlow artifact.

### `POST /artifact/migrate`

This endpoint deploys an iFlow artifact to an SAP CPI tenant.

-   **Request Body:**
    ```json
    {
      "iflowName": "YourIFlowName",
      "iflowId": "your_iflow_id",
      "packageId": "your_package_id",
      "artifactContent": "<Base64 encoded content of the zip file>",
      "cpiHostName": "your-tenant.it-cpi001.cfapps.eu10.hana.ondemand.com",
      "accessTokenUri": "https://your-tenant.authentication.eu10.hana.ondemand.com/oauth/token",
      "clientId": "your_client_id",
      "clientSecret": "your_client_secret"
    }
    ```
-   **Response:** A JSON object indicating the success or failure of the migration.

### Adding New Adaptors to `CPISourceXMLV2.js`

The `CPISourceXMLV2.js` file acts as a central repository for XML templates of various SAP CPI components, including sender and receiver adaptors. To extend the application's capabilities with new adaptor types, you need to add their corresponding XML definitions to this file.

Follow these steps to add a new adaptor:

1.  **Identify Adaptor Type:** Determine if the new adaptor is a `SenderAdaptors` or `ReceiverAdaptors`.
2.  **Locate the `SourceXML` Array:** Open `CPISourceXMLV2.js`. You'll find an exported constant named `SourceXML`, which is an array of objects.
3.  **Find the Correct Object:**
    *   For **Sender Adaptors**, navigate to the object at index `1` of the `SourceXML` array, then to the `SenderAdaptors` property.
    *   For **Receiver Adaptors**, navigate to the object at index `1` of the `SourceXML` array, then to the `ReceiverAdaptors` property.
4.  **Add the XML Template:**
    *   Add a new property to the `SenderAdaptors` or `ReceiverAdaptors` object.
    *   The **key** of this new property should be the name of your adaptor (e.g., `"NEW_ADAPTOR"`). This key will be used to reference the adaptor programmatically.
    *   The **value** of the property should be a backtick-quoted (`) multi-line string containing the full XML definition for your adaptor. This XML snippet typically represents a `<bpmn2:messageFlow>` element.

    **Example Structure for a New Sender Adaptor:**

    ```javascript
    export const SourceXML = [
      // ... other objects
      {
        SenderAdaptors: {
          // ... existing sender adaptors
          NEW_ADAPTOR: `<bpmn2:messageFlow id="MessageFlow_" name="NewAdaptor" sourceRef="" targetRef="">
              <bpmn2:extensionElements>
                  <ifl:property>
                      <key>ComponentType</key>
                      <value>NewAdaptor</value>
                  </ifl:property>
                  <ifl:property>
                      <key>Name</key>
                      <value>NewAdaptor</value>
                  </ifl:property>
                  <!-- Add all relevant ifl:property elements for your adaptor -->
                  <ifl:property>
                      <key>customProperty</key>
                      <value>{{MessageFlow_customProperty}}</value>
                  </ifl:property>
                  <ifl:property>
                      <key>direction</key>
                      <value>Sender</value>
                  </ifl:property>
                  <!-- ... other properties ... -->
              </bpmn2:extensionElements>
          </bpmn2:messageFlow>`,
        },
        ReceiverAdaptors: {
          // ... existing receiver adaptors
        }
      },
      // ... other objects
    ];
    ```

    **Key Considerations for the XML Template:**
    *   **`id="MessageFlow_"`:** Always use `"MessageFlow_"` as the `id` for `bpmn2:messageFlow`. The application will dynamically replace this during iFlow generation.
    *   **`name="YourAdaptorName"`:** Set the `name` attribute to a descriptive name for your adaptor.
    *   **`<ifl:property>` elements:** These define the configuration parameters for your adaptor.
        *   `key`: The name of the property.
        *   `value`: The default value or a placeholder like `{{MessageFlow_propertyName}}`. The placeholders are crucial as they allow dynamic insertion of values from the input JSON during iFlow generation.
    *   **`direction` property:** Ensure the `<ifl:property>` with `key="direction"` has the correct value (`Sender` or `Receiver`).

5.  **Test Your Changes:** After adding a new adaptor, thoroughly test the iFlow generation and deployment process to ensure the new adaptor is correctly integrated and configured.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or higher)
-   [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To start the server in development mode (with auto-reloading via `nodemon`):
```bash
npm start
```
The server will be running on `http://localhost:5000`.

## Deployment

The application is configured for deployment to cloud platforms like Cloud Foundry or Heroku.

-   **Procfile:** `web: npm start`
-   **manifest.yaml:** Contains configuration for Cloud Foundry deployments, including memory limits and the buildpack to be used.
