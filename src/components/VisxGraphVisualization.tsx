import React from 'react';
import { Graph } from "react-d3-graph";

// Define the types for the graph data
interface GraphData {
  nodes: { id: string }[];
  links: { source: string; target: string }[];
}

interface GraphVisualizationProps {
  data: GraphData;
  title: string;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ data, title }) => {
  // Graph configuration
  const config = {
    nodeHighlightBehavior: true,
    node: {
      color: 'lightblue',
      size: 300,
      highlightStrokeColor: 'blue',
    },
    link: {
      highlightColor: 'lightblue',
    },
    directed: true,
  };

  return (
    <div>
      <h3>{title}</h3>
      <Graph
        id={title} // Unique identifier for the graph
        data={data}
        config={config}
      />
    </div>
  );
};

export default GraphVisualization;
