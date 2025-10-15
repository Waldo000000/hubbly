/**
 * UI Component Tests
 * Tests basic HTML button behaviors that are used throughout the app
 */

import { render, screen, fireEvent } from '../setup/test-utils';

describe('UI Component Patterns', () => {
  describe('Basic Button Behavior', () => {
    it('renders button with text', () => {
      render(<button>Click me</button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<button onClick={handleClick}>Click me</button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
      render(<button disabled>Disabled button</button>);
      
      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<button onClick={handleClick} disabled>Disabled button</button>);
      
      const button = screen.getByRole('button', { name: /disabled button/i });
      fireEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Form Input Behavior', () => {
    it('renders input with placeholder', () => {
      render(<input placeholder="Enter your name" />);
      
      const input = screen.getByPlaceholderText('Enter your name');
      expect(input).toBeInTheDocument();
    });

    it('updates value when typed', () => {
      render(<input data-testid="test-input" />);
      
      const input = screen.getByTestId('test-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test value' } });
      
      expect(input.value).toBe('test value');
    });

    it('respects required attribute', () => {
      render(<input required data-testid="required-input" />);
      
      const input = screen.getByTestId('required-input');
      expect(input).toBeRequired();
    });
  });
});