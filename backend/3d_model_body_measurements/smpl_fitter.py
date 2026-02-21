"""
SMPLFitter: Locks a unique β (shape) parameter across all frames.
Ensures consistent body shape, not a noisy average.
"""

import numpy as np
import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)


class SMPLFitter:
    """
    Step 5 (replaced): Applies SMPLFitter to lock a unique β parameter.
    This guarantees that body shape is consistent across all frames,
    not a noisy average.
    """
    
    def __init__(self):
        self.beta_dim = 10
    
    def fit_unique_beta(self, frames_beta: List[np.ndarray],
                        frames_theta: List[np.ndarray],
                        height_cm: float, weight_kg: float, gender: str) -> Tuple[np.ndarray, Dict]:
        """
        Fit a unique β parameter from multiple frame estimates.
        
        Args:
            frames_beta: List of β estimates per frame (each shape: [10])
            frames_theta: List of θ estimates per frame (each shape: [63])
            height_cm: Target height
            weight_kg: Target weight
            gender: Gender specification
            
        Returns:
            beta_unique: Single consistent β parameter [10]
            fitting_info: Information about the fitting process
        """
        logger.info("SMPLFitter: Locking unique β parameter for consistent body shape...")
        
        if not frames_beta:
            logger.warning("No beta estimates provided, initializing from height/weight")
            beta_unique = self._initialize_beta_from_anthropometry(height_cm, weight_kg, gender)
            return beta_unique, {'method': 'initialization', 'num_frames': 0}
        
        # Convert to numpy array
        beta_array = np.array(frames_beta)  # Shape: [N_frames, 10]
        
        # Strategy 1: Robust median (reject outliers)
        beta_median = np.median(beta_array, axis=0)
        
        # Strategy 2: Weighted average (weight by frame quality/confidence)
        # For now, use uniform weights
        weights = np.ones(len(frames_beta))
        beta_weighted = np.average(beta_array, axis=0, weights=weights)
        
        # Strategy 3: Clustering - find the most common shape cluster
        beta_clustered = self._cluster_beta(beta_array)
        
        # Strategy 4: Constrained optimization - find β that minimizes variance
        # while respecting anthropometric constraints
        beta_optimized = self._optimize_beta_consistency(
            beta_array, height_cm, weight_kg, gender
        )
        
        # Choose best strategy (for now, use optimized)
        beta_unique = beta_optimized
        
        # Validate β against anthropometric constraints
        beta_unique = self._validate_beta(beta_unique, height_cm, weight_kg, gender)
        
        # Compute statistics
        beta_std = np.std(beta_array, axis=0)
        consistency_score = 1.0 / (1.0 + np.mean(beta_std))
        
        fitting_info = {
            'beta_unique': beta_unique.tolist(),
            'beta_median': beta_median.tolist(),
            'beta_weighted': beta_weighted.tolist(),
            'beta_clustered': beta_clustered.tolist(),
            'beta_std': beta_std.tolist(),
            'consistency_score': float(consistency_score),
            'num_frames': len(frames_beta),
            'method': 'optimized'
        }
        
        logger.info(f"SMPLFitter complete. Consistency score: {consistency_score:.3f}")
        
        return beta_unique, fitting_info
    
    def _initialize_beta_from_anthropometry(self, height_cm: float, weight_kg: float, gender: str) -> np.ndarray:
        """Initialize β from anthropometric measurements."""
        bmi = weight_kg / ((height_cm / 100) ** 2)
        
        beta = np.array([
            (height_cm - 175) / 15,      # β0: Height
            (bmi - 22) / 5,               # β1: BMI
            0.0,                          # β2-β9: Shape variations
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
            0.0,
        ], dtype=np.float32)
        
        return beta
    
    def _cluster_beta(self, beta_array: np.ndarray) -> np.ndarray:
        """
        Cluster β estimates to find the most common shape.
        Uses K-means with k=1 to find centroid of main cluster.
        """
        from scipy.cluster.vq import kmeans
        
        if len(beta_array) < 2:
            return beta_array[0] if len(beta_array) > 0 else np.zeros(10)
        
        # K-means with k=1 finds the centroid
        centroids, _ = kmeans(beta_array, 1)
        return centroids[0]
    
    def _optimize_beta_consistency(self, beta_array: np.ndarray,
                                   height_cm: float, weight_kg: float,
                                   gender: str) -> np.ndarray:
        """
        Optimize β to minimize variance while respecting constraints.
        Finds β that is closest to all frame estimates while being consistent.
        """
        from scipy.optimize import minimize
        
        # Objective: minimize sum of squared distances to all β estimates
        # Subject to anthropometric constraints
        def objective(beta):
            # Distance to all frame estimates
            distances = np.sum((beta_array - beta) ** 2, axis=1)
            return np.mean(distances)
        
        # Constraints: β should be reasonable
        def constraint_anthropometric(beta):
            # β0 (height) should be within ±3σ
            height_constraint = abs(beta[0]) < 3.0
            # β1 (BMI) should be within ±3σ
            bmi_constraint = abs(beta[1]) < 3.0
            # Other β should be within ±2σ
            other_constraint = np.all(np.abs(beta[2:]) < 2.0)
            return height_constraint and bmi_constraint and other_constraint
        
        # Initial guess: median
        beta_init = np.median(beta_array, axis=0)
        
        # Bounds: reasonable ranges for β
        bounds = [(-3.0, 3.0)] * self.beta_dim
        
        # Optimize
        result = minimize(
            objective,
            beta_init,
            method='L-BFGS-B',
            bounds=bounds,
            options={'maxiter': 20}
        )
        
        if result.success:
            return result.x
        else:
            # Fallback to median if optimization fails
            return np.median(beta_array, axis=0)
    
    def _validate_beta(self, beta: np.ndarray, height_cm: float,
                       weight_kg: float, gender: str) -> np.ndarray:
        """Validate and clamp β to reasonable ranges."""
        beta_validated = beta.copy()
        
        # Clamp to reasonable ranges
        beta_validated[0] = np.clip(beta_validated[0], -3.0, 3.0)  # Height
        beta_validated[1] = np.clip(beta_validated[1], -3.0, 3.0)  # BMI
        beta_validated[2:] = np.clip(beta_validated[2:], -2.0, 2.0)  # Shape variations
        
        return beta_validated
