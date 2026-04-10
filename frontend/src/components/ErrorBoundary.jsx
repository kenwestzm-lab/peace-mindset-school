import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:20,color:'red',background:'#111',minHeight:'100vh',wordBreak:'break-all'}}>
        <h2>App Error:</h2>
        <pre style={{fontSize:12,color:'#ff6b6b'}}>{this.state.error?.toString()}</pre>
        <pre style={{fontSize:10,color:'#888'}}>{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}
