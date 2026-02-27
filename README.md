# Quantum Pong

Quantum Pong is a reimagining of the classic Pong game, designed to portray quantum mechanical behavior in an intuitive and interactive way.  
The project demonstrates fundamental concepts of quantum physics through gameplay mechanics.

---

## Core Concepts

### Wave-Particle Duality (Superposition)
- Particle represented as a dot.  
- Wave represented as a probability cloud.  
- Probability density visualized using a Gaussian distribution.  
- Each frame samples a possible detected position, illustrating uncertainty in quantum states.  

### Quantum Tunneling
- Obstacles act as potential barriers.  
- Modeled as Dirac delta potentials: `V(x) = gδ(x)`.  
- Transmission vs Reflection probabilities determine whether the particle tunnels through or bounces back.  

---

## Gameplay

- The ball behaves as a quantum particle:
  - Appears as a probability cloud until measured.  
  - Paddle acts as measurement, collapsing the cloud into a single particle position.  
- Obstacles serve as potential barriers:
  - If Transmission Probability (T) > Reflection Probability (R), the particle tunnels through.  
  - Otherwise, it reflects back.  
- The first player to reach ten points wins.  

---

## Implementation Notes

- **Gaussian Probability Cloud**  
  - Centered at mean position μ.  
  - Width controlled by standard deviation σ.  
  - Sampling implemented using polar method randomness.  

- **Quantum Tunneling Approximation**  
  - Binary decision: tunnel (T) or reflect (R).  
  - Future work includes more accurate modeling of superposition outcomes after tunneling.  

---

## Technology Stack

- Framework: Next.js  
- Language: TypeScript  
- AI Support: Claude  

---

## References

- [Gaussian Wavepackets (Reed College)](https://www.reed.edu/physics/faculty/wheeler/documents/Quantum%20Mechanics/Miscellaneous%20Essays/Gaussian%20Wavepackets.pdf)  
- [Gaussian Wave Packet Explanation](https://askfilo.com/user-question-answers-smart-solutions/explain-gau-ssian-wave-packet-and-prove-that-it-varies-with-3335373538313434)  
- [NISER Lecture Notes](https://www.niser.ac.in/~sbasak/p303_2010/06.09.pdf)  
- [Illinois Physics Tunneling Exercises](https://courses.physics.illinois.edu/phys485/fa2015/web/homework/tunneling_ex.pdf)  

---

## Future Directions

- Extend tunneling model beyond binary outcomes.  
- Explore multi-dimensional superposition visualizations.  
- Add interactive demos for deeper quantum mechanics concepts.  

---

## Acknowledgments

Created by Ankesh Kumar.  
Inspired by the idea of making physics playable, visual, and engaging.
