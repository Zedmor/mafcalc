import React from 'react';
import { Graph, DefaultLink } from '@visx/network';

// Define the structure of a node
interface Node {
  id: number;
  x: number;
  y: number;
}

// Define the structure of a link
interface Link {
  source: Node;
  target: Node;
}

// Define the structure of the graph data
interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface VisxGraphVisualizationProps {
  data: GraphData;
  title: string;
}

// Define the props for the custom node component
interface CustomNodeProps {
  node: Node;
}

const CustomNode: React.FC<CustomNodeProps> = ({ node }) => {
  return (
    <circle
      r={10}
      fill="lightblue"
      stroke="blue"
      strokeWidth={1.5}
      cx={node.x}
      cy={node.y}
    />
  );
};

const VisxGraphVisualization: React.FC<VisxGraphVisualizationProps> = ({ data, title }) => {
  // Define the dimensions of the SVG canvas
  const width = 800;
  const height = 600;

  return (
    <div>
      <h3>{title}</h3>
      <svg width={width} height={height}>
        <Graph
          graph={data}
          linkComponent={DefaultLink}
          nodeComponent={CustomNode}
        />
      </svg>
    </div>
  );
};

export default VisxGraphVisualization;