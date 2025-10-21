use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct InputManager {
    pub keyboard_state: HashMap<KeyCode, bool>,
    pub mouse_state: MouseState,
    pub gamepad_state: GamepadState,
    pub input_queue: Vec<InputEvent>,
    pub input_mapping: InputMapping,
}

impl InputManager {
    pub fn new() -> Self {
        Self {
            keyboard_state: HashMap::new(),
            mouse_state: MouseState::default(),
            gamepad_state: GamepadState::default(),
            input_queue: Vec::new(),
            input_mapping: InputMapping::new(),
        }
    }
    
    pub fn initialize(&mut self) -> Result<()> {
        info!("🎮 Initializing input manager");
        
        // Initialize keyboard state
        self.keyboard_state.clear();
        
        // Initialize mouse state
        self.mouse_state = MouseState::default();
        
        // Initialize gamepad state
        self.gamepad_state = GamepadState::default();
        
        // Set up input mapping
        self.setup_default_input_mapping()?;
        
        info!("✅ Input manager initialized");
        Ok(())
    }
    
    pub fn process_input(&mut self, input: InputEvent) -> Result<()> {
        match input.input_type {
            crate::InputType::Keyboard { key } => {
                let key_code = self.parse_key_code(&key)?;
                self.keyboard_state.insert(key_code, input.value > 0.5);
            }
            crate::InputType::Mouse { button, x, y } => {
                let mouse_button = self.parse_mouse_button(&button)?;
                self.mouse_state.buttons.insert(mouse_button, input.value > 0.5);
                self.mouse_state.x = x;
                self.mouse_state.y = y;
            }
            crate::InputType::Gamepad { button, axis } => {
                let gamepad_button = self.parse_gamepad_button(&button)?;
                self.gamepad_state.buttons.insert(gamepad_button, input.value > 0.5);
                self.gamepad_state.axes.insert(axis, input.value);
            }
        }
        
        Ok(())
    }
    
    pub fn update(&mut self, delta_time: f32) -> Result<()> {
        // Process input queue
        for input in self.input_queue.drain(..) {
            self.process_input(input)?;
        }
        
        // Update input state
        self.update_input_state(delta_time)?;
        
        Ok(())
    }
    
    pub fn is_key_pressed(&self, key: KeyCode) -> bool {
        self.keyboard_state.get(&key).copied().unwrap_or(false)
    }
    
    pub fn is_key_just_pressed(&self, key: KeyCode) -> bool {
        // Check if key was just pressed this frame
        self.keyboard_state.get(&key).copied().unwrap_or(false)
    }
    
    pub fn is_mouse_button_pressed(&self, button: MouseButton) -> bool {
        self.mouse_state.buttons.get(&button).copied().unwrap_or(false)
    }
    
    pub fn get_mouse_position(&self) -> (f32, f32) {
        (self.mouse_state.x, self.mouse_state.y)
    }
    
    pub fn get_mouse_delta(&self) -> (f32, f32) {
        (self.mouse_state.delta_x, self.mouse_state.delta_y)
    }
    
    pub fn is_gamepad_button_pressed(&self, button: GamepadButton) -> bool {
        self.gamepad_state.buttons.get(&button).copied().unwrap_or(false)
    }
    
    pub fn get_gamepad_axis(&self, axis: &str) -> f32 {
        self.gamepad_state.axes.get(axis).copied().unwrap_or(0.0)
    }
    
    pub fn get_input_vector(&self, action: &str) -> (f32, f32) {
        if let Some(mapping) = self.input_mapping.get_mapping(action) {
            let mut x = 0.0;
            let mut y = 0.0;
            
            for input in &mapping.inputs {
                match input {
                    InputType::Keyboard { key } => {
                        let key_code = self.parse_key_code(key).unwrap_or(KeyCode::Unknown);
                        if self.is_key_pressed(key_code) {
                            x += input.value;
                        }
                    }
                    InputType::Gamepad { button, axis } => {
                        if let Some(button) = self.parse_gamepad_button(button).ok() {
                            if self.is_gamepad_button_pressed(button) {
                                x += input.value;
                            }
                        }
                        if let Some(axis_value) = self.gamepad_state.axes.get(axis) {
                            x += axis_value * input.value;
                        }
                    }
                    _ => {}
                }
            }
            
            (x, y)
        } else {
            (0.0, 0.0)
        }
    }
    
    fn setup_default_input_mapping(&mut self) -> Result<()> {
        info!("🎮 Setting up default input mapping");
        
        // Movement mapping
        let mut movement_inputs = Vec::new();
        movement_inputs.push(InputType::Keyboard { key: "A".to_string() });
        movement_inputs.push(InputType::Keyboard { key: "D".to_string() });
        movement_inputs.push(InputType::Gamepad { button: "LeftStick".to_string(), axis: "X".to_string() });
        
        self.input_mapping.add_mapping("move_horizontal".to_string(), movement_inputs);
        
        // Jump mapping
        let mut jump_inputs = Vec::new();
        jump_inputs.push(InputType::Keyboard { key: "Space".to_string() });
        jump_inputs.push(InputType::Gamepad { button: "A".to_string(), axis: "".to_string() });
        
        self.input_mapping.add_mapping("jump".to_string(), jump_inputs);
        
        info!("✅ Default input mapping set up");
        Ok(())
    }
    
    fn parse_key_code(&self, key: &str) -> Result<KeyCode> {
        match key.to_uppercase().as_str() {
            "A" => Ok(KeyCode::A),
            "B" => Ok(KeyCode::B),
            "C" => Ok(KeyCode::C),
            "D" => Ok(KeyCode::D),
            "E" => Ok(KeyCode::E),
            "F" => Ok(KeyCode::F),
            "G" => Ok(KeyCode::G),
            "H" => Ok(KeyCode::H),
            "I" => Ok(KeyCode::I),
            "J" => Ok(KeyCode::J),
            "K" => Ok(KeyCode::K),
            "L" => Ok(KeyCode::L),
            "M" => Ok(KeyCode::M),
            "N" => Ok(KeyCode::N),
            "O" => Ok(KeyCode::O),
            "P" => Ok(KeyCode::P),
            "Q" => Ok(KeyCode::Q),
            "R" => Ok(KeyCode::R),
            "S" => Ok(KeyCode::S),
            "T" => Ok(KeyCode::T),
            "U" => Ok(KeyCode::U),
            "V" => Ok(KeyCode::V),
            "W" => Ok(KeyCode::W),
            "X" => Ok(KeyCode::X),
            "Y" => Ok(KeyCode::Y),
            "Z" => Ok(KeyCode::Z),
            "SPACE" => Ok(KeyCode::Space),
            "ENTER" => Ok(KeyCode::Enter),
            "ESCAPE" => Ok(KeyCode::Escape),
            "SHIFT" => Ok(KeyCode::Shift),
            "CTRL" => Ok(KeyCode::Control),
            "ALT" => Ok(KeyCode::Alt),
            "TAB" => Ok(KeyCode::Tab),
            "BACKSPACE" => Ok(KeyCode::Backspace),
            "DELETE" => Ok(KeyCode::Delete),
            "ARROW_UP" => Ok(KeyCode::ArrowUp),
            "ARROW_DOWN" => Ok(KeyCode::ArrowDown),
            "ARROW_LEFT" => Ok(KeyCode::ArrowLeft),
            "ARROW_RIGHT" => Ok(KeyCode::ArrowRight),
            _ => Ok(KeyCode::Unknown),
        }
    }
    
    fn parse_mouse_button(&self, button: &str) -> Result<MouseButton> {
        match button.to_lowercase().as_str() {
            "left" => Ok(MouseButton::Left),
            "right" => Ok(MouseButton::Right),
            "middle" => Ok(MouseButton::Middle),
            "button4" => Ok(MouseButton::Button4),
            "button5" => Ok(MouseButton::Button5),
            _ => Ok(MouseButton::Unknown),
        }
    }
    
    fn parse_gamepad_button(&self, button: &str) -> Result<GamepadButton> {
        match button.to_uppercase().as_str() {
            "A" => Ok(GamepadButton::A),
            "B" => Ok(GamepadButton::B),
            "X" => Ok(GamepadButton::X),
            "Y" => Ok(GamepadButton::Y),
            "LEFT_SHOULDER" => Ok(GamepadButton::LeftShoulder),
            "RIGHT_SHOULDER" => Ok(GamepadButton::RightShoulder),
            "LEFT_TRIGGER" => Ok(GamepadButton::LeftTrigger),
            "RIGHT_TRIGGER" => Ok(GamepadButton::RightTrigger),
            "DPAD_UP" => Ok(GamepadButton::DpadUp),
            "DPAD_DOWN" => Ok(GamepadButton::DpadDown),
            "DPAD_LEFT" => Ok(GamepadButton::DpadLeft),
            "DPAD_RIGHT" => Ok(GamepadButton::DpadRight),
            "START" => Ok(GamepadButton::Start),
            "SELECT" => Ok(GamepadButton::Select),
            "LEFT_STICK" => Ok(GamepadButton::LeftStick),
            "RIGHT_STICK" => Ok(GamepadButton::RightStick),
            _ => Ok(GamepadButton::Unknown),
        }
    }
    
    fn update_input_state(&mut self, delta_time: f32) -> Result<()> {
        // Update input state
        // This would typically involve updating input timers, debouncing, etc.
        
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct MouseState {
    pub x: f32,
    pub y: f32,
    pub delta_x: f32,
    pub delta_y: f32,
    pub buttons: HashMap<MouseButton, bool>,
}

#[derive(Debug, Clone, Default)]
pub struct GamepadState {
    pub buttons: HashMap<GamepadButton, bool>,
    pub axes: HashMap<String, f32>,
}

#[derive(Debug, Clone)]
pub struct InputMapping {
    pub mappings: HashMap<String, Vec<InputType>>,
}

impl InputMapping {
    pub fn new() -> Self {
        Self {
            mappings: HashMap::new(),
        }
    }
    
    pub fn add_mapping(&mut self, action: String, inputs: Vec<InputType>) {
        self.mappings.insert(action, inputs);
    }
    
    pub fn get_mapping(&self, action: &str) -> Option<&Vec<InputType>> {
        self.mappings.get(action)
    }
    
    pub fn remove_mapping(&mut self, action: &str) {
        self.mappings.remove(action);
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum KeyCode {
    A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
    Space, Enter, Escape, Shift, Control, Alt, Tab, Backspace, Delete,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    Button4,
    Button5,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum GamepadButton {
    A,
    B,
    X,
    Y,
    LeftShoulder,
    RightShoulder,
    LeftTrigger,
    RightTrigger,
    DpadUp,
    DpadDown,
    DpadLeft,
    DpadRight,
    Start,
    Select,
    LeftStick,
    RightStick,
    Unknown,
}

#[derive(Debug, Clone)]
pub enum InputType {
    Keyboard { key: String },
    Mouse { button: String, x: f32, y: f32 },
    Gamepad { button: String, axis: String },
}

impl InputType {
    pub fn value(&self) -> f32 {
        match self {
            InputType::Keyboard { .. } => 1.0,
            InputType::Mouse { .. } => 1.0,
            InputType::Gamepad { .. } => 1.0,
        }
    }
}

pub struct InputRecorder {
    pub recording: bool,
    pub recorded_inputs: Vec<RecordedInput>,
    pub playback_index: usize,
    pub playback_speed: f32,
}

impl InputRecorder {
    pub fn new() -> Self {
        Self {
            recording: false,
            recorded_inputs: Vec::new(),
            playback_index: 0,
            playback_speed: 1.0,
        }
    }
    
    pub fn start_recording(&mut self) {
        self.recording = true;
        self.recorded_inputs.clear();
        self.playback_index = 0;
    }
    
    pub fn stop_recording(&mut self) {
        self.recording = false;
    }
    
    pub fn record_input(&mut self, input: InputEvent, timestamp: f32) {
        if self.recording {
            self.recorded_inputs.push(RecordedInput {
                input,
                timestamp,
            });
        }
    }
    
    pub fn start_playback(&mut self) {
        self.playback_index = 0;
    }
    
    pub fn get_next_input(&mut self, current_time: f32) -> Option<InputEvent> {
        if self.playback_index < self.recorded_inputs.len() {
            let recorded_input = &self.recorded_inputs[self.playback_index];
            if current_time >= recorded_input.timestamp / self.playback_speed {
                self.playback_index += 1;
                return Some(recorded_input.input.clone());
            }
        }
        None
    }
    
    pub fn set_playback_speed(&mut self, speed: f32) {
        self.playback_speed = speed;
    }
    
    pub fn save_recording(&self, path: &str) -> Result<()> {
        let data = serde_json::to_string(&self.recorded_inputs)?;
        std::fs::write(path, data)?;
        Ok(())
    }
    
    pub fn load_recording(&mut self, path: &str) -> Result<()> {
        let data = std::fs::read_to_string(path)?;
        self.recorded_inputs = serde_json::from_str(&data)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct RecordedInput {
    pub input: InputEvent,
    pub timestamp: f32,
}

#[derive(Debug, Clone)]
pub struct InputEvent {
    pub input_type: InputType,
    pub value: f32,
}

impl InputEvent {
    pub fn new(input_type: InputType, value: f32) -> Self {
        Self { input_type, value }
    }
}

