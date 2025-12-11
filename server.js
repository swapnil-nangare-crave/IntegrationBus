import { SourceXML } from "./CPISourceXMLV2.js";
import express from "express";
import cors from "cors";
import axios from "axios";
import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { updateStepSpecificTags } from "./utils.js";

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());


const ExternalizeParameters=(json)=>{

  const output = [];

  // Loop senders
  if (json.senders && Array.isArray(json.senders)) {
    json.senders.forEach(sender => {
      if (sender.config) {
        Object.entries(sender.config).forEach(([key, value]) => {
          output.push(`${key}=${value}`);
        });
      }
    });
  }

  // Loop receivers
  if (json.receivers && Array.isArray(json.receivers)) {
    json.receivers.forEach(receiver => {
      if (receiver.config) {
        Object.entries(receiver.config).forEach(([key, value]) => {
          output.push(`${key}=${value}`);
        });
      }
    });
  }

  return output.join("\n");
}

  const buildDefaultProjectFiles = (MetaInfofileContent,MFContent,projectxmlFile,iflowName,PM1Content,PM2Content) => {
    const currentDate = new Date();
    const day = currentDate.toLocaleString("en-US", { weekday: "short" });
    const month = currentDate.toLocaleString("en-US", { month: "short" });
    const date = currentDate.getDate();
    const year = currentDate.getFullYear();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();

    const formattedDateTime = `${day} ${month} ${date} ${hours}:${minutes}:${seconds} UTC ${year}`;
    const MIfileContent = `#Store metainfo properties\n#${formattedDateTime}\ndescription\n`;
    MetaInfofileContent=MIfileContent;

    const PM1 = `#${formattedDateTime}`;
    PM1Content=PM1;

    let ipackge = `Import-Package: com.sap.esb.application.services.cxf.interceptor,com.sap
 .esb.security,com.sap.it.op.agent.api,com.sap.it.op.agent.collector.cam
 el,com.sap.it.op.agent.collector.cxf,com.sap.it.op.agent.mpl,javax.jms,
 javax.jws,javax.wsdl,javax.xml.bind.annotation,javax.xml.namespace,java
 x.xml.ws,org.apache.camel;version="2.8",org.apache.camel.builder;versio
 n="2.8",org.apache.camel.builder.xml;version="2.8",org.apache.camel.com
 ponent.cxf,org.apache.camel.model;version="2.8",org.apache.camel.proces
 sor;version="2.8",org.apache.camel.processor.aggregate;version="2.8",or
 g.apache.camel.spring.spi;version="2.8",org.apache.commons.logging,org.
 apache.cxf.binding,org.apache.cxf.binding.soap,org.apache.cxf.binding.s
 oap.spring,org.apache.cxf.bus,org.apache.cxf.bus.resource,org.apache.cx
 f.bus.spring,org.apache.cxf.buslifecycle,org.apache.cxf.catalog,org.apa
 che.cxf.configuration.jsse;version="2.5",org.apache.cxf.configuration.s
 pring,org.apache.cxf.endpoint,org.apache.cxf.headers,org.apache.cxf.int
 erceptor,org.apache.cxf.management.counters;version="2.5",org.apache.cx
 f.message,org.apache.cxf.phase,org.apache.cxf.resource,org.apache.cxf.s
 ervice.factory,org.apache.cxf.service.model,org.apache.cxf.transport,or
 g.apache.cxf.transport.common.gzip,org.apache.cxf.transport.http,org.ap
 ache.cxf.transport.http.policy,org.apache.cxf.workqueue,org.apache.cxf.
 ws.rm.persistence,org.apache.cxf.wsdl11,org.osgi.framework;version="1.6
 .0",org.slf4j;version="1.6",org.springframework.beans.factory.config;ve
 rsion="3.0",com.sap.esb.camel.security.cms,org.apache.camel.spi,com.sap
 .esb.webservice.audit.log,com.sap.esb.camel.endpoint.configurator.api,c
 om.sap.esb.camel.jdbc.idempotency.reorg,javax.sql,org.apache.camel.proc
 essor.idempotent.jdbc,org.osgi.service.blueprint;version="[1.0.0,2.0.0)
 "`;
    const TemplateData = {
      manifestdata: `Manifest-Version: 1.0\nBundle-ManifestVersion: 2\nBundle-Name: ${iflowName}\nBundle-SymbolicName: ${iflowName}; singleton:=true\nBundle-Version: 1.0.0\nSAP-BundleType: IntegrationFlow\nSAP-NodeType: IFLMAP\nSAP-RuntimeProfile: iflmap\n${ipackge}\nImport-Service: com.sap.esb.webservice.audit.log.AuditLogger,com.sap.esb.security.KeyManagerFactory;multiple:=false,com.sap.esb.security.TrustManagerFactory;multiple:=false,javax.sql.DataSource;multiple:=false;filter=\"(dataSourceName=default)\",org.apache.cxf.ws.rm.persistence.RMStore;multiple:=false,com.sap.esb.camel.security.cms.SignatureSplitter;multiple:=false\nOrigin-Bundle-Name: ${iflowName}\nOrigin-Bundle-SymbolicName: ${iflowName}\n`,
      projectData: `<?xml version=\"1.0\" encoding=\"UTF-8\"?><projectDescription>\n   <name>${iflowName}</name>\n   <comment/>\n   <projects/>\n   <buildSpec>\n      <buildCommand>\n         <name>org.eclipse.jdt.core.javabuilder</name>\n         <arguments/>\n      </buildCommand>\n   </buildSpec>\n   <natures>\n      <nature>org.eclipse.jdt.core.javanature</nature>\n      <nature>com.sap.ide.ifl.project.support.project.nature</nature>\n      <nature>com.sap.ide.ifl.bsn</nature>\n   </natures>\n</projectDescription>`,
      parameters: `<?xml version="1.0" encoding="UTF-8" standalone="no"?><parameters><param_references/></parameters>`,
    };

    const projectDataContent = TemplateData.projectData;
    projectxmlFile=projectDataContent;

    const parametersContent = TemplateData.parameters;
    PM2Content=parametersContent;

    const MFfileContent = TemplateData.manifestdata;
    MFContent=MFfileContent;

    return {MetaInfofileContent,MFContent,projectxmlFile,PM1Content,PM2Content}
  };

  // stage one - participants
const CreateCollaboration=(data)=>{

    const extensionElements = SourceXML[2].Collaboration.ExtensinElements;
    
    // Build participants XML by looping over all senders and receivers
    let participants = "";

    // Loop through all senders
    for (let i = 0; i < data.senders.length; i++) {
        participants += SourceXML[2].participants.Sender;
      }

    function updateReceiverId(xmlString, receiverCounter) {
      const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      };
      
      const parser = new XMLParser(options);
      let jsonObj = parser.parse(xmlString);

      if (jsonObj["bpmn2:participant"]) {
        jsonObj["bpmn2:participant"]["@_id"] = `Participant_${receiverCounter}`;
      }

      const builder = new XMLBuilder(options);
      const updatedXML = builder.build(jsonObj);

      return { updatedXML, receiverCounter };
    }

    // Loop through all receivers
    for (let j = 0; j < data.receivers.length; j++) {
        let receiver = SourceXML[2].participants.Receiver;
        let result = updateReceiverId(receiver, j+2);
        participants += result.updatedXML;
    }

    // Always add IntegrationProcess participant
    participants += SourceXML[2].participants.IntegrationProcess || "";
    let messageFlow = "";

    function updateMessageFlowIds(xmlString,connector) {

      const options = {
        ignoreAttributes: false, // Parse attributes as well
        attributeNamePrefix: "@_", // Prefix for attribute names
      };

      //* Replace all {{MessageFlow_xxx}} placeholders in XML with {{<dynamicId>_xxx}}

      function replaceMessageFlowPlaceholders(xml, dynamicId = "MessageFlow") {
        if (typeof xml !== "string") return xml; // prevent crashing
        const pattern = /\{\{MessageFlow_(.*?)\}\}/g;
        return xml.replace(pattern, (match, group1) => {
          return `{{${dynamicId}_${group1}}}`;
        });
      }
    
      xmlString = replaceMessageFlowPlaceholders(xmlString, connector.id);

      // Parse XML string to JSON object
      const parser = new XMLParser(options);
      let jsonObj = parser.parse(xmlString);

      // Example manipulation: Update callActivity id attribute
      if (jsonObj["bpmn2:messageFlow"] && jsonObj["bpmn2:messageFlow"]["@_id"]) {
        jsonObj["bpmn2:messageFlow"]["@_id"] = `${connector.id}`;
        jsonObj["bpmn2:messageFlow"]["@_sourceRef"] = `${connector.source}`;
        jsonObj["bpmn2:messageFlow"]["@_targetRef"] = `${connector.target}`;
      }

      // Convert JSON object back to XML string
      const builder = new XMLBuilder(options);
      const updatedXML = builder.build(jsonObj);

      return { updatedXML };
    }

    data.senders.forEach((senderConnector) => {
    let sourceXML = SourceXML[1].SenderAdaptors[senderConnector.type.toUpperCase()];
     if (!sourceXML) {
    throw new Error(`Unsupported sender type: ${senderConnector.type}`);
  }
    let result = updateMessageFlowIds(sourceXML, senderConnector);
    messageFlow += result.updatedXML;
  });

  data.receivers.forEach((receiverConnector) => {    
    let sourceXML = SourceXML[1].ReceiverAdaptors[receiverConnector.type.toUpperCase()];   
    
     if (!sourceXML) {
    throw new Error(`Unsupported receiver type: ${receiverConnector.type}`);
  }

    return `<bpmn2:collaboration id="Collaboration_1" name="Default Collaboration">${extensionElements}${participants}${messageFlow}</bpmn2:collaboration>`;
} 

//stage two - pallete functions 
const CreateIntegrationProcess=(data)=>{
    const extensionElements = SourceXML[3].IntegrationProcess.extensionElements;

    let exceptionSubprocessXML = SourceXML[2].participants.exceptionSubprocess;

    var events;

    function StartEventUpdate(eventXML,currentstep) {
      const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      };

      const parser = new XMLParser(options);
      const builder = new XMLBuilder(options);

      // Parse the XML events string to a JSON object
      let jsonObj = parser.parse(eventXML);

      // Locate the startEvent element and update its outgoing element
      if (jsonObj["bpmn2:startEvent"]) {
        jsonObj["bpmn2:startEvent"]["@_id"] = currentstep.id;
        jsonObj["bpmn2:startEvent"]["bpmn2:outgoing"] = currentstep.outgoing;
      }

      // Convert the JSON object back to an XML string
      let updatedEventXML = builder.build(jsonObj);

      return updatedEventXML;
    }

    function EndEventUpdate(eventXML,currentstep) {
      const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      };

      const parser = new XMLParser(options);
      const builder = new XMLBuilder(options);

      // Parse the XML events string to a JSON object
      let jsonObj = parser.parse(eventXML);

      // Locate the endEvent element and update its incoming element
      if (jsonObj["bpmn2:endEvent"]) {
        jsonObj["bpmn2:endEvent"]["@_id"]= currentstep.id;
        jsonObj["bpmn2:endEvent"]["bpmn2:incoming"] = currentstep.incoming;
      }

      // Convert the JSON object back to an XML string
      let updatedeEventXML = builder.build(jsonObj);

      return updatedeEventXML;
    }

    function TerminateMessageUpdate(eventXML,currentstep) {
      const options = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      };

      const parser = new XMLParser(options);
      const builder = new XMLBuilder(options);

      // Parse the XML events string to a JSON object
      let jsonObj = parser.parse(eventXML);

      // Locate the endEvent element and update its incoming element
      if (jsonObj["bpmn2:endEvent"]) {
        jsonObj["bpmn2:endEvent"]["@_id"]= currentstep.id;
        jsonObj["bpmn2:endEvent"]["bpmn2:incoming"] = currentstep.incoming;
      }

      // Convert the JSON object back to an XML string
      let updatedeEventXML = builder.build(jsonObj);

      return updatedeEventXML;
    }

    data.steps.forEach((currentstep) => {
      if(currentstep.type =="StartEvent" ){
       let eventXML = `${SourceXML[0].events.StartEvent}`;
       let eventResult = StartEventUpdate(eventXML,currentstep);
        events += eventResult;
      }else if(currentstep.type =="EndEvent"){
        let eventXML = `${SourceXML[0].events.EndEvent}`;
        let eventResult= EndEventUpdate(eventXML,currentstep);
        events +=eventResult;
      }else if(currentstep.type =="TerminateMessage"){
        let eventXML = `${SourceXML[0].events.TerminateMessage}`;
        let eventResult= TerminateMessageUpdate(eventXML,currentstep);
        events +=eventResult;
      }
    })

    var palleteItems = "";

    function updatePalleteItemsIds(xmlString, currentstep) {
      const options = {
        ignoreAttributes: false, // Parse attributes as well
        attributeNamePrefix: "@_", // Prefix for attribute names
      };

      // Parse XML string to JSON object
      const parser = new XMLParser(options);
      let jsonObj = parser.parse(xmlString);

      // Example manipulation: Update callActivity id attribute
      if ( jsonObj["bpmn2:callActivity"] && jsonObj["bpmn2:callActivity"]["@_id"]) {
        jsonObj["bpmn2:callActivity"]["@_id"] = `${currentstep.id}`;
        if (Array.isArray(currentstep.incoming)) {
            jsonObj["bpmn2:callActivity"]["bpmn2:incoming"] = currentstep.incoming.map(val => `${val}`);
        } else {
            jsonObj["bpmn2:callActivity"]["bpmn2:incoming"] = `${currentstep.incoming}`;
        }
        if (Array.isArray(currentstep.outgoing)) {
            jsonObj["bpmn2:callActivity"]["bpmn2:outgoing"] = currentstep.outgoing.map(val => `${val}`);
        } else {
            jsonObj["bpmn2:callActivity"]["bpmn2:outgoing"] = `${currentstep.outgoing}`;
        }
        if (currentstep.lable !== undefined && currentstep.lable !== null && currentstep.lable !== "") {
          jsonObj["bpmn2:callActivity"]["@_name"] = currentstep.lable;
        }

        // Handle script and XSLT specific updates
        if (currentstep.type === 'groovyScript') {
          // Find script property and update it
          if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"] &&
              jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"]) {
            const properties = jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"];
            if (Array.isArray(properties)) {
              properties.forEach(prop => {
                if (prop.key === 'script') {
                    prop.value = `${currentstep.lable}.groovy`;
                  }
                });
            } else if (properties.key === 'script') {
                properties.value = `${currentstep.lable}.groovy`;
              }
            }
        }else if (currentstep.type === 'xsltMapping') {
          // Find XSLT mapping properties and update them
          if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"] && jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"]) {
            const properties = jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"];
            if (Array.isArray(properties)) {
              properties.forEach(prop => {
                if (prop.key === 'mappinguri') {
                    prop.value = `dir://mapping/xslt/src/main/resources/mapping/XSLTMapping${currentstep.lable}.xsl`;
                  }else if (prop.key === 'mappingname') {
                    prop.value = `${currentstep.lable}`;
                  }else if (prop.key === 'mappingpath') {
                    prop.value = `src/main/resources/mapping/XSLTMapping${currentstep.lable}`
                }
              });
            }
          }
        }
      }else if(jsonObj["bpmn2:exclusiveGateway"] && jsonObj["bpmn2:exclusiveGateway"]["@_id"]){
        jsonObj["bpmn2:exclusiveGateway"]["@_id"] = `${currentstep.id}`;
        if (currentstep.lable !== undefined && currentstep.lable !== null && currentstep.lable !== "") {
          jsonObj["bpmn2:exclusiveGateway"]["@_name"] = currentstep.lable;
        }
        // Handle incoming as array or single value
        if (Array.isArray(currentstep.incoming)) {
          jsonObj["bpmn2:exclusiveGateway"]["bpmn2:incoming"] = currentstep.incoming.map(val => `${val}`);
        } else {
          jsonObj["bpmn2:exclusiveGateway"]["bpmn2:incoming"] = `${currentstep.incoming}`;
        }
        // Handle outgoing as array or single value
        if (Array.isArray(currentstep.outgoing)) {
          jsonObj["bpmn2:exclusiveGateway"]["bpmn2:outgoing"] = currentstep.outgoing.map(val => `${val}`);
        } else {
          jsonObj["bpmn2:exclusiveGateway"]["bpmn2:outgoing"] = `${currentstep.outgoing}`;
        }
      }else if(jsonObj["bpmn2:parallelGateway"] && jsonObj["bpmn2:parallelGateway"]["@_id"]){
        jsonObj["bpmn2:parallelGateway"]["@_id"] = `${currentstep.id}`;
        if (currentstep.lable !== undefined && currentstep.lable !== null && currentstep.lable !== "") {
          jsonObj["bpmn2:parallelGateway"]["@_name"] = currentstep.lable;
        }
        jsonObj["bpmn2:parallelGateway"]["bpmn2:incoming"] = `${currentstep.incoming}`;
        if (Array.isArray(currentstep.outgoing)) {
          // If outgoing is an array, add each outgoing as a separate element (array of outgoings)
          jsonObj["bpmn2:parallelGateway"]["bpmn2:outgoing"] = currentstep.outgoing.map(entry => entry);
        } else {
          jsonObj["bpmn2:parallelGateway"]["bpmn2:outgoing"] = `${currentstep.outgoing}`;
        }
      }else if(jsonObj["bpmn2:serviceTask"] && jsonObj["bpmn2:serviceTask"]["@_id"]){
        jsonObj["bpmn2:serviceTask"]["@_id"] = `${currentstep.id}`;
        jsonObj["bpmn2:serviceTask"]["bpmn2:incoming"] = `${currentstep.incoming}`;
        jsonObj["bpmn2:serviceTask"]["bpmn2:incoming"] = `${currentstep.outgoing}`;
        if (currentstep.lable !== undefined && currentstep.lable !== null && currentstep.lable !== "") {
          jsonObj["bpmn2:serviceTask"]["@_name"] = currentstep.lable;
        }
      }

      const builder = new XMLBuilder(options);
      const updatedXML = builder.build(jsonObj);
      return { updatedXML};
    }

    // Generate XML for each shapes skipping exceptionSubprocess, events 
    data.steps.forEach((currentstep) => {
      if ( currentstep.type == 'exceptionSubprocess' || currentstep.type == 'StartEvent' || currentstep.type =='EndEvent' || currentstep.type =='TerminateMessage') return; // skip from main sequence
      let sourceXML = SourceXML[0].palleteItems[currentstep.type];
      
      if (sourceXML) {
        let result = updatePalleteItemsIds(sourceXML,currentstep);
        let configuredXML = updateStepSpecificTags(result.updatedXML,currentstep);
        palleteItems += configuredXML;
      } else {
        console.warn(`No XML template found for CPI alternative: ${currentstep.type}`);
        // Create a basic callActivity as fallback
        const fallbackXML = `<bpmn2:callActivity id="${currentstep.id}" name="${currentstep.type}">
          <bpmn2:extensionElements>
            <ifl:property>
              <key>componentVersion</key>
              <value>1.0</value>
            </ifl:property>
            <ifl:property>
              <key>activityType</key>
              <value>${currentstep.type}</value>
            </ifl:property>
          </bpmn2:extensionElements>
          <bpmn2:incoming>${currentstep.incoming}</bpmn2:incoming>
          <bpmn2:outgoing>${currentstep.outgoing}</bpmn2:outgoing>
        </bpmn2:callActivity>`;
        palleteItems += fallbackXML;
      }
    });

    function updateSequenceFlowIds(xmlString,sFlow) {
      const options = {
        ignoreAttributes: false, // Parse attributes as well
        attributeNamePrefix: "@_", // Prefix for attribute names
      };

      // Parse XML string to JSON object
      const parser = new XMLParser(options);
      let jsonObj = parser.parse(xmlString);

      // Update sequenceFlow id attribute
      if (jsonObj && jsonObj["bpmn2:sequenceFlow"]) {
        jsonObj["bpmn2:sequenceFlow"]["@_id"] = `${sFlow.id}`;
        // Set sourceRef and targetRef robustly
        if (sFlow.sourceRef) {
          jsonObj["bpmn2:sequenceFlow"]["@_sourceRef"] = sFlow.sourceRef;
        } else {
          jsonObj["bpmn2:sequenceFlow"]["@_sourceRef"] = sFlow.sourceRef;
        }
        if (sFlow.targetRef) {
          jsonObj["bpmn2:sequenceFlow"]["@_targetRef"] = sFlow.targetRef;
        } else {
          jsonObj["bpmn2:sequenceFlow"]["@_targetRef"] = sFlow.targetRef;
        }
      }

      // Convert JSON object back to XML string
      const builder = new XMLBuilder(options);
      const updatedXML = builder.build(jsonObj);

      return { updatedXML};
    }

    let sequenceFlows = "";
  
   data.sequenceFlows.forEach((sFlow)=>{
    let sourceXML = SourceXML[0].sequenceFlow;
    let result = updateSequenceFlowIds(sourceXML,sFlow);
    sequenceFlows += result.updatedXML;
   })
   
    // Insert exception subprocess after extensionElements and before palleteItems
    return `<bpmn2:process id="Process_1" name="Integration Process">${extensionElements}${exceptionSubprocessXML}${events}${palleteItems}${sequenceFlows}</bpmn2:process>`;
}

//stage three - UI representation
const CreateBPMNDiagram=(data)=>{

  const CreateBPMPlane_1 = (data) => {
    let bpmnShapes = SourceXML[4].BPMNDiagram.defaultBPMNShape;
  
    // --- Layout constants ---
    const shapeWidth = 100.0;
    const shapeHeight = 60.0;
    const xStart = 450.0;
    const yStart = 132.0;
    const xSpacing = 150.0; 
    const yBranchSpacing = shapeHeight + 100;
  
    const eventSize = 32.0;
  
    // --- Dynamic positions ---
    const positions = {};
    const visited = new Set();
  
    function placeStep(stepId, x, y, branchOffset = 0) {
      if (visited.has(stepId)) return;
      visited.add(stepId);
  
      const step = data.steps.find(s => s.id === stepId);
      if (!step) return;
  
      positions[stepId] = { x, y, w: shapeWidth, h: shapeHeight };
  
      if ((step.type === "parallelMulticast" || step.type === "sequentialMulticast" || step.type === "router") && Array.isArray(step.outgoing)) {
        step.outgoing.forEach((flowId, i) => {
          const targetStep = data.sequenceFlows.find(f => f.id === flowId)?.targetRef;
          if (targetStep) {
            placeStep(targetStep, x + xSpacing, y + i * yBranchSpacing);
          }
        });
      } else if (step.outgoing) {
        const flowId = Array.isArray(step.outgoing) ? step.outgoing[0] : step.outgoing;
        const targetStep = data.sequenceFlows.find(f => f.id === flowId)?.targetRef;
        if (targetStep) {
          placeStep(targetStep, x + xSpacing, y);
        }
      }
    }
  
    // --- Start traversal from StartEvent ---
    const start = data.steps.find(s => s.type === "StartEvent");
    if (start) {
      placeStep(start.id, xStart, yStart);
    }
  
    // --- Process bounds ---
    const xs = Object.values(positions).map(p => p.x);
    const ys = Object.values(positions).map(p => p.y);
  
    const processWidth = Math.max(...xs) - Math.min(...xs) + shapeWidth + 200;
    const processHeight = Math.max(...ys) - Math.min(...ys) + shapeHeight + 300; // add space for subprocess
    const processX = Math.min(...xs) - 100;
    const processY = Math.min(...ys) - 100;
  
    bpmnShapes = bpmnShapes.replace(
      /<bpmndi:BPMNShape bpmnElement="Participant_Process_1" id="BPMNShape_Participant_Process_1">[\s\S]*?<\/bpmndi:BPMNShape>/,
      `<bpmndi:BPMNShape bpmnElement="Participant_Process_1" id="BPMNShape_Participant_Process_1">
        <dc:Bounds height="${processHeight}" width="${processWidth}" x="${processX}" y="${processY}"/>
      </bpmndi:BPMNShape>`
    );
  
    // --- Add BPMN shapes ---
    data.steps.forEach((step) => {
      const { x, y } = positions[step.id];
      const bpmnElement = step.id;
      const id = `BPMNShape_${step.id}`;
      const h = (step.type === "StartEvent" || step.type === "EndEvent") ? eventSize : shapeHeight;
      const w = (step.type === "StartEvent" || step.type === "EndEvent") ? eventSize : shapeWidth;
  
      bpmnShapes += `
        <bpmndi:BPMNShape bpmnElement="${bpmnElement}" id="${id}">
          <dc:Bounds height="${h}" width="${w}" x="${x}" y="${y}"/>
        </bpmndi:BPMNShape>`;
    });
  
    // --- Add receiver participants ---
    data.receivers.forEach((receiver, index) => {
      const bpmnElement = `${receiver.target}`;
      const id = `BPMNShape_${receiver.target}`;
      const x = 585.0 + index * 300;
      const y = -100.0;
      bpmnShapes += `
        <bpmndi:BPMNShape bpmnElement="${bpmnElement}" id="${id}">
          <dc:Bounds height="140.0" width="100.0" x="${x}" y="${y}"/>
        </bpmndi:BPMNShape>`;
    });
  
    // --- Exception Subprocess placement ---
    const maxY = Math.max(...ys);
    const subProcX = processX + 50;
    const subProcY = maxY + shapeHeight + 40;
  
    // container
    bpmnShapes += `
      <bpmndi:BPMNShape bpmnElement="SubProcess_1" id="BPMNShape_SubProcess_1">
        <dc:Bounds height="140.0" width="400.0" x="${subProcX}" y="${subProcY}"/>
      </bpmndi:BPMNShape>`;
  
    // Error Start inside subprocess
    bpmnShapes += `
      <bpmndi:BPMNShape bpmnElement="StartEvent_13" id="BPMNShape_StartEvent_13">
        <dc:Bounds height="32.0" width="32.0" x="${subProcX + 50}" y="${subProcY + 46}"/>
      </bpmndi:BPMNShape>`;
  
    // Error End inside subprocess
    bpmnShapes += `
      <bpmndi:BPMNShape bpmnElement="EndEvent_14" id="BPMNShape_EndEvent_14">
        <dc:Bounds height="32.0" width="32.0" x="${subProcX + 300}" y="${subProcY + 46}"/>
      </bpmndi:BPMNShape>`;
  
    // --- Edges ---

    // Calculate edge for exception subprocess SequenceFlow_15 (StartEvent_13 -> EndEvent_14)

      // These are the shapes for the error subprocess
      const startX = subProcX + 50 + 32; // right edge of StartEvent_13
      const startY = subProcY + 46 + 16; // vertical center of StartEvent_13
      const endX = subProcX + 300;       // left edge of EndEvent_14
      const endY = subProcY + 46 + 16;   // vertical center of EndEvent_14

      let bpmnEdges="";

      bpmnEdges += `
        <bpmndi:BPMNEdge bpmnElement="SequenceFlow_15" id="BPMNEdge_SequenceFlow_15" sourceElement="BPMNShape_StartEvent_13" targetElement="BPMNShape_EndEvent_14">
          <di:waypoint x="${startX}" xsi:type="dc:Point" y="${startY}"/>
          <di:waypoint x="${endX}" xsi:type="dc:Point" y="${endY}"/>
        </bpmndi:BPMNEdge>`;
  
    data.sequenceFlows.forEach((sFlow) => {
      const source = positions[sFlow.sourceRef];
      const target = positions[sFlow.targetRef];
      if (!source || !target) return;
  
      let startX = source.x + source.w;
      let startY = source.y + source.h / 2;
      let endX = target.x;
      let endY = target.y + target.h / 2;
  
      const bpmnElement = `${sFlow.id}`;
      const id = `BPMNEdge_${sFlow.id}`;
      const sourceRef = sFlow.sourceRef;
      const targetRef = sFlow.targetRef;
  
      bpmnEdges += `
        <bpmndi:BPMNEdge bpmnElement="${bpmnElement}" id="${id}" sourceElement="BPMNShape_${sourceRef}" targetElement="BPMNShape_${targetRef}">
          <di:waypoint x="${startX}" xsi:type="dc:Point" y="${startY}"/>
          <di:waypoint x="${endX}" xsi:type="dc:Point" y="${endY}"/>
        </bpmndi:BPMNEdge>`;
    });
  
    data.messageFlows.forEach((mFlow) => {
      const bpmnElement = `${mFlow.id}`;
      const id = `BPMNEdge_${mFlow.id}`;
      const sourceRef = mFlow.sourceRef;
      const targetRef = mFlow.targetRef;
      bpmnEdges += `
        <bpmndi:BPMNEdge bpmnElement="${bpmnElement}" id="${id}" sourceElement="BPMNShape_${sourceRef}" targetElement="BPMNShape_${targetRef}">
          <di:waypoint x="90" xsi:type="dc:Point" y="170"/>
          <di:waypoint x="308" xsi:type="dc:Point" y="158"/>
        </bpmndi:BPMNEdge>`;
    });
  
    return `<bpmndi:BPMNPlane bpmnElement="Collaboration_1" id="BPMNPlane_1">${bpmnShapes}${bpmnEdges}</bpmndi:BPMNPlane>`;
  };
  
  let bpmPlane_1 = CreateBPMPlane_1(data);
  return `<bpmndi:BPMNDiagram id="BPMNDiagram_1" name="Default Collaboration Diagram">${bpmPlane_1}</bpmndi:BPMNDiagram>`;
}

const generateIflowXML = (data) => {
  const defaultXMLCode = `<?xml version="1.0" encoding="UTF-8"?><bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:ifl="http:///com.sap.ifl.model/Ifl.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1">`;
  const collaboration = CreateCollaboration(data); // stage one - participants
  const process =  CreateIntegrationProcess(data); //stage two - pallete functions 
  const bpmnDiagram = CreateBPMNDiagram(data); //stage three - UI representation

  let iflowXMLCode = `${defaultXMLCode}${collaboration}${process}${bpmnDiagram}</bpmn2:definitions>`;
  // Ensure all messageEventDefinition tags are self-closing
  iflowXMLCode = iflowXMLCode.replace(/<bpmn2:messageEventDefinition>\s*<\/bpmn2:messageEventDefinition>/g, '<bpmn2:messageEventDefinition/>');
  // Ensure all sequenceFlow tags are self-closing
  iflowXMLCode = iflowXMLCode.replace(/<bpmn2:sequenceFlow([^>]*)>\s*<\/bpmn2:sequenceFlow>/g, '<bpmn2:sequenceFlow$1/>');
  return iflowXMLCode;
};

const DownloadZip = async(MetaInfofileContent,MFContent,projectxmlFile,iflowName,PM1Content,PM2Content,iflowXMLBuffer,data) => {
  const zip = new JSZip();

  // Create folders and add files
  zip.file("metainfo.prop", MetaInfofileContent);
  zip.file(".project", projectxmlFile);
  zip
    .folder("src")
    .folder("main")
    .folder("resources")
    .folder("scenarioflows")
    .folder("integrationflow")
    .file(`${iflowName}.iflw`, iflowXMLBuffer, {binary: true});
  zip.folder("META-INF").file("MANIFEST.MF", MFContent);
  zip
    .folder("src")
    .folder("main")
    .folder("resources")
    .file("parameters.prop", PM1Content);
  zip
    .folder("src")
    .folder("main")
    .folder("resources")
    .file("parameters.propdef", PM2Content);

  // Add scripts to the zip
  if (Array.isArray(data.scripts) && data.scripts.length > 0) {
    const scriptFolder = zip.folder("src").folder("main").folder("resources").folder("script");
    data.scripts.forEach((scriptObj) => {
      if (scriptObj && scriptObj.content) {
        scriptFolder.file(`${scriptObj.name}.groovy`, scriptObj.content);
      }
    });
  }

  // Add XSLTs to the mapping folder in the zip
  if (Array.isArray(data.xslts) && data.xslts.length > 0) {
    const mappingFolder = zip.folder("src").folder("main").folder("resources").folder("mapping");
    data.xslts.forEach((xsltObj) => {
      if (xsltObj && xsltObj.name && xsltObj.content) {
        mappingFolder.file(`${xsltObj.name}.xsl`, xsltObj.content);
      }
    });
  }

  // Add map files and XSDs from mapArray
  if (Array.isArray(data.mappings) && data.mappings.length > 0) {
    const mappingFolder = zip.folder("src").folder("main").folder("resources").folder("mapping");
    const xsdFolder = zip.folder("src").folder("main").folder("resources").folder("xsd");
    data.mappings.forEach((mapObj) => {
      if(mapObj){
        mappingFolder.file(`${mapObj.name}.mmap`, mapObj.content);
        xsdFolder.file(`${mapObj.sourceSchema.name}.xsd`, mapObj.sourceSchema.content);
        xsdFolder.file(`${mapObj.targetSchema.name}.xsd`, mapObj.targetSchema.content);
      }
    });
  }

  zip.folder("src").folder("main").folder("resources").folder("json");
  zip.folder("src").folder("main").folder("resources").folder("mapping");
  zip.folder("src").folder("main").folder("resources").folder("xsd");
  zip.folder("src").folder("main").folder("resources").folder("edmx");
  zip.folder("src").folder("main").folder("resources").folder("wsdl");

  // Generate the zip file 

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" }).then((zipContent) => {
    let zipName = `${iflowName}.zip`;
    return {zipContent,zipName}
  }); 

  return zipBuffer;
};

// Route to handle form submission
app.post("/artifact/migrate", async (req, res) => {
  const {
    iflowName,
    iflowId,
    packageId,
    artifactContent,
    cpiHostName,
    accessTokenUri,
    clientId,
    clientSecret,
  } = req.body;

  // Validate required fields
  if (
    !iflowName ||
    !iflowId ||
    !packageId ||
    !artifactContent ||
    !cpiHostName ||
    !accessTokenUri ||
    !clientId ||
    !clientSecret
  ) {
    return res.status(400).json({
      status: "error",
      message: "All fields are required. Please provide valid data.",
    });


  }

  try {
    // Step 1: Get OAuth 2.0 token
    const tokenResponse = await axios.post(
      accessTokenUri,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const apiUrl = `https://${cpiHostName}/api/v1/IntegrationDesigntimeArtifacts`; // Replace with the actual endpoint
    const apiResponse = await axios.post(
      apiUrl,
      {
       "Name":iflowName,
       "Id": iflowId,
       "PackageId":packageId,
       "ArtifactContent":artifactContent,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Step 3: Send the API response back to the client
    res.status(200).json({
      status: "success",
      message: "Processe successfully migrated to Integration Suite.",
      data: apiResponse.data,
    });
  } catch (error) {
    console.error("Error during migration:", error.message);

    // Handle errors (e.g., OAuth or API request failures)
    res.status(500).json({
      status: "error",
      message: "An error occurred during the migration process.",
      error: error.response?.data || error.message,
    });
  }
});

app.post("/get-iflow-zip", async(req,res) =>{
    const data = req.body;

    let MetaInfofileContent = "";
    let MFContent = "";
    let projectxmlFile="";
    let PM1Content="";
    let PM2Content="";
    const iflowName=data.iflowName;
    let iflowXML="";
    
    const defualtProjectFiles = buildDefaultProjectFiles(MetaInfofileContent,MFContent,projectxmlFile,iflowName,PM1Content,PM2Content);
    
    MetaInfofileContent = defualtProjectFiles.MetaInfofileContent;
    MFContent = defualtProjectFiles.MFContent;
    projectxmlFile = defualtProjectFiles.projectxmlFile;
    PM1Content = defualtProjectFiles.PM1Content;
    PM2Content = defualtProjectFiles.PM2Content;
    
    iflowXML = generateIflowXML(data);
    const externalization = ExternalizeParameters(data);
    PM1Content = PM1Content + "\n" + externalization;
    
    const iflowXMLBuffer = Buffer.from(iflowXML, 'utf8');

    const Zip =  DownloadZip(MetaInfofileContent,MFContent,projectxmlFile,iflowName,PM1Content,PM2Content,iflowXMLBuffer,data); 

    // Wait for the zip to be generated and send it as a response
    if (Zip && typeof Zip.then === "function") {
        Zip.then(({ zipContent, zipName }) => {
            res.set({
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${zipName}"`
            });
            res.status(200).send(zipContent);
        }).catch((err) => {
            console.error("Error generating zip:", err);
            res.status(500).json({
                status: "error",
                message: "Failed to generate zip file. Please check the supported components before proceeding for Migration!",
                error: err.message
            });
        });
    } else {
        res.status(500).json({
            status: "error",
            message: "Failed to initiate zip generation. Please check the supported components before proceeding for Migration!"
        });
    }

})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
