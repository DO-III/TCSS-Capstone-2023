'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { ExpressInstrumentation, ExpressLayerType } = require("@opentelemetry/instrumentation-express");
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const opentelemetry = require('@opentelemetry/api');
const { AsyncHooksContextManager } = require('@opentelemetry/context-async-hooks');

//Set up the context manager for non-HTTP spans.
const contextManager = new AsyncHooksContextManager();
contextManager.enable();
opentelemetry.context.setGlobalContextManager(contextManager);


module.exports = (serviceName) => {
  let exporter = new ZipkinExporter();
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation({
        ignoreLayersType: [ExpressLayerType.MIDDLEWARE, ExpressLayerType.REQUEST_HANDLER],
        
        requestHook: function (span, info) {
            span.setAttribute([SemanticResourceAttributes.SERVICE_NAME], serviceName);
        }
        
      })
    ],
  });

  return opentelemetry.trace.getTracer('experiment-tracer');
};