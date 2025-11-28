import { XMLParser, XMLBuilder } from "fast-xml-parser";// Function to update step-specific XML tag values for each step type


export function updateStepSpecificTags(updatedXML, currentstep) {
  if (currentstep.type === 'messageMapping') {
    return configureMessageMapping(updatedXML, currentstep);
  }else if (currentstep.type === 'xsltMapping') {
    return configureXSLTMapping(updatedXML, currentstep);
  }else if (currentstep.type === 'groovyScript') {
    return configureGroovyScript(updatedXML, currentstep);
  }else if (currentstep.type === 'contentModifier') {
    return configureContentModifier(updatedXML, currentstep);
  }
  return updatedXML;
  }

function configureContentModifier(updatedXML, currentstep) {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  };

  const parser = new XMLParser(options);
  let jsonObj = parser.parse(updatedXML);

  if (jsonObj["bpmn2:callActivity"] && currentstep.config) {
    const properties = jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]?.["ifl:property"];

    if (Array.isArray(properties)) {
      // Handle headerTable and propertyTable
      if (currentstep.config.headerTable) {
        let headerTableValue = "";
        for (const header of currentstep.config.headerTable) {
          headerTableValue += `<row><cell id='Action'>${header.action}</cell><cell id='Type'>${header.type}</cell><cell id='Value'>${header.value}</cell><cell id='Default'>${header.default || ''}</cell><cell id='Name'>${header.name}</cell><cell id='Datatype'>${header.datatype}</cell></row>`;
        }
        const headerTableProp = properties.find(p => p.key === 'headerTable');
        if (headerTableProp) {
          headerTableProp.value = headerTableValue;
        }
      }

      if (currentstep.config.propertyTable) {
        let propertyTableValue = "";
        for (const prop of currentstep.config.propertyTable) {
          propertyTableValue += `<row><cell id='Action'>${prop.action}</cell><cell id='Type'>${prop.type}</cell><cell id='Value'>${prop.value}</cell><cell id='Default'>${prop.default || ''}</cell><cell id='Name'>${prop.name}</cell><cell id='Datatype'>${prop.datatype}</cell></row>`;
        }
        const propertyTableProp = properties.find(p => p.key === 'propertyTable');
        if (propertyTableProp) {
          propertyTableProp.value = propertyTableValue;
        }
      }

      // Handle other properties
      for (const key in currentstep.config) {
        if (key !== 'headerTable' && key !== 'propertyTable') {
          let prop = properties.find(p => p.key === key);
          if (prop) {
            prop.value = currentstep.config[key];
          } else {
            // Check for <step_id>_<property_name> convention
            const keyParts = key.split('_');
            if (keyParts.length > 1) {
              const propName = keyParts.slice(1).join('_');
              prop = properties.find(p => p.key === propName);
              if (prop) {
                prop.value = currentstep.config[key];
              } else {
                // if property not in XML, add it
                properties.push({
                    key: propName,
                    value: currentstep.config[key]
                });
              }
            } else {
                // if property not in XML, add it
                properties.push({
                    key: key,
                    value: currentstep.config[key]
                });
            }
          }
        }
      }
    }
  }

  const builder = new XMLBuilder(options);
  return builder.build(jsonObj);
}

function configureXSLTMapping(updatedXML, currentstep) {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  };
  const parser = new XMLParser(options);
  let jsonObj = parser.parse(updatedXML);
  if (jsonObj["bpmn2:callActivity"] && currentstep.config) {
    if (currentstep.config.xsltName !== undefined) {
      if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
          && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
        jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
          if (prop["key"] === "mappinguri") {
            prop["value"] = `dir://mapping/xslt/src/main/resources/mapping/${currentstep.config.xsltName}.xsl`;
          }
        });
      }
    }
    if (currentstep.config.xsltName !== undefined) {
      if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
          && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
        jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
          if (prop["key"] === "mappingname") {
            prop["value"] = currentstep.config.xsltName;
          }
        });
      }
    }
    if (currentstep.config.xsltName !== undefined) {
      if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
          && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
        jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
          if (prop["key"] === "mappingpath") {
            prop["value"] = `src/main/resources/mapping/${currentstep.config.xsltName}`;
          }
        });
      }
    }
  }
  const builder = new XMLBuilder(options);
  return builder.build(jsonObj);
}

function configureGroovyScript(updatedXML, currentstep) {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  };
  const parser = new XMLParser(options);        
  let jsonObj = parser.parse(updatedXML);
  if (jsonObj["bpmn2:callActivity"] && currentstep.config) {
    if (currentstep.config.scriptName !== undefined) {
      if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
          && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
        jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
          if (prop["key"] === "script") {
            prop["value"] = `${currentstep.config.scriptName}.groovy`;
          }
        });
      }
    }
  }
  const builder = new XMLBuilder(options);
  return builder.build(jsonObj);
}

function configureMessageMapping(updatedXML, currentstep) {
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    };
    const parser = new XMLParser(options);
    let jsonObj = parser.parse(updatedXML);

    if (jsonObj["bpmn2:callActivity"] && currentstep.config) {
      if (currentstep.config.mappingName !== undefined) {
        if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
            && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
          jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
            if (prop["key"] === "mappinguri") {
              prop["value"] = `dir://mmap/src/main/resources/mapping/${currentstep.config.mappingName}.mmap`;
            }
          });
        }
      }
      if (currentstep.config.mappingName !== undefined) {
        if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
            && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
          jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
            if (prop["key"] === "mappingname") {
              prop["value"] = currentstep.config.mappingName;
            }
          });
        }
      }
      if (currentstep.config.mappingName !== undefined) {
        if (jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]
            && Array.isArray(jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"])) {
          jsonObj["bpmn2:callActivity"]["bpmn2:extensionElements"]["ifl:property"].forEach(prop => {
            if (prop["key"] === "mappingpath") {
              prop["value"] = `src/main/resources/mapping/${currentstep.config.mappingName}`;
            }
          });
        }
      }
    }

    const builder = new XMLBuilder(options);
    return builder.build(jsonObj);
}