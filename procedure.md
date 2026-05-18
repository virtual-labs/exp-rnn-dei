### Procedure

The objective of this part of the experiment is to implement a vanilla Recurrent Neural Network (RNN) for character-level sequence modeling. The Tiny Shakespeare dataset is used, where individual characters from a text corpus are learned to model sequential dependencies and generate coherent text. This part focuses on understanding sequence unrolling, hidden-state propagation over time steps, and training RNNs using Backpropagation Through Time (BPTT), as well as visualizing the evolution of hidden states during text generation.

---

#### 1. Import Required Libraries

Import necessary Python libraries such as PyTorch, NumPy, and Matplotlib for model implementation, numerical operations, and visualizations.

---

#### 2. Dataset Description and Loading

The Tiny Shakespeare dataset is a character-level text corpus containing a small subset of William Shakespeare's plays. It consists of dialogues, character names, and stage directions, all written in plain text.

- Each character (letters, digits, punctuation, spaces) is treated as an individual token.
- The dataset is suitable for sequence modelling and text generation tasks.
- The text file is downloaded and loaded into memory for further pre-processing.

The successful loading of the dataset is verified.

---

#### 3. Dataset Splitting

The text dataset is divided into three parts:

- **Training set (90%)** – used for learning model parameters
- **Validation set (5%)** – used to monitor overfitting
- **Test set (5%)** – used for final evaluation

This ensures proper training and evaluation of the model.

---

#### 4. Vocabulary Creation and Encoding

- Extract all unique characters to form the vocabulary.
- Map each character to a unique integer index (character-to-index mapping).
- Convert the entire text into a sequence of integers.

---

#### 5. Hyper-parameter Initialization

Initialize training parameters such as:

- Number of epochs
- Learning rate
- Embedding size
- Batch size
- Sequence length
- Hidden layer size
- Number of RNN layers

These parameters control learning behaviour and model capacity.

---

#### 6. Batch Generation

Create mini-batches of input and target sequences with fixed sequence lengths (sliding-window approach) to enable efficient training. Input sequences (x) and target sequences (y) are created such that each target character is the next character in the sequence.

---

#### 7. RNN Model Definition

Define a Character-level RNN model consisting of:

- An Embedding layer to convert character indices into dense vectors
- A multi-layer vanilla RNN to process sequential data
- A Fully Connected (Linear) layer to predict the next character

Initialize the model with zero hidden states.

---

#### 8. Model Training

- Train the RNN using Backpropagation Through Time (BPTT).
- Use Cross-Entropy Loss as the objective function.
- Optimize the model using the Adam optimizer.
- Apply gradient clipping to prevent exploding gradients.
- Record training and validation loss after each epoch.

---

#### 9. Loss Curve Visualization

Plot training and validation loss curves to analyze model convergence and learning behavior.

---

#### 10. Text Generation

After training, generate new text by:

- Providing a seed string
- Predicting one character at a time
- Feeding the previously generated character back into the model

---

#### 11. Hidden State Visualization

- Extract hidden states for a short character sequence.
- Plot the evolution of selected hidden units across time steps.
- Analyse how the RNN maintains memory over the sequence.

---

#### 12. Result Analysis

The generated text, loss curves, and hidden-state plots are analysed to evaluate the effectiveness of the RNN in learning sequential character-level patterns.