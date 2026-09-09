import './input.css';

interface InputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const Input = ({
  id,
  value,
  onChange,
  placeholder = '',
  autoFocus = false,
}: InputProps) => (
  <input
    id={id}
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    autoFocus={autoFocus}
  />
);
