import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  /** Changing this remounts the boundary, so navigating away clears the error. */
  resetKey: string
  toolTitle: string
  children: ReactNode
}

type State = { error: Error | null; info: string }

const REPO = 'https://github.com/Akashkunwar/bitkit'

/**
 * Keeps one failing tool from blanking the whole app.
 *
 * React unmounts the entire tree on an uncaught render error, so without this
 * a single bad code path takes the navigation with it and the user cannot even
 * click away. The fallback stays inside the shell and offers a report link
 * with the details already filled in.
 */
export class ToolBoundary extends Component<Props, State> {
  state: State = { error: null, info: '' }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, info: '' })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept local: this is the only place the stack is recorded, and it is
    // shown to the user rather than sent anywhere.
    this.setState({ info: info.componentStack ?? '' })
    console.error('Tool crashed:', error)
  }

  private issueUrl(): string {
    const { error, info } = this.state
    const title = `${this.props.toolTitle} crashed: ${error?.message ?? 'unknown error'}`
    const body = [
      '### What I was doing',
      '',
      '',
      '### Error',
      '```',
      `${error?.name ?? 'Error'}: ${error?.message ?? ''}`,
      (error?.stack ?? '').split('\n').slice(0, 12).join('\n'),
      '```',
      '',
      '### Component stack',
      '```',
      info.split('\n').slice(0, 12).join('\n'),
      '```',
      '',
      `Browser: ${navigator.userAgent}`,
    ].join('\n')
    return `${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="crash" role="alert">
        <h2>{this.props.toolTitle} hit an error</h2>
        <p>
          The rest of BitKit is still working — pick another tool from the sidebar, or try this one again.
          Nothing you dropped in was uploaded, and nothing was saved.
        </p>
        <pre className="crash-detail">
          {error.name}: {error.message}
        </pre>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => this.setState({ error: null, info: '' })}>
            Try again
          </button>
          <a className="btn" href={this.issueUrl()} target="_blank" rel="noreferrer noopener">
            Report it
          </a>
        </div>
        <p className="hint">
          The report link opens a pre-filled GitHub issue. Check it before submitting — it includes the error
          message and your browser version.
        </p>
      </div>
    )
  }
}
