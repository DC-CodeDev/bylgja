import { createElement, useEffect, useRef, useState } from "react";
//#region dist/core/spring-solver.js
function assertFinite(value, name) {
	if (!Number.isFinite(value)) throw new Error(`SpringSolver requires ${name} to be finite.`);
}
var SpringSolver = class {
	stiffness;
	damping;
	mass;
	timestep;
	velocityThreshold;
	positionThreshold;
	value;
	target;
	velocity;
	accumulator = 0;
	constructor(initialValue, targetValue, config, initialVelocity = 0) {
		assertFinite(initialValue, "initialValue");
		assertFinite(targetValue, "targetValue");
		assertFinite(initialVelocity, "initialVelocity");
		assertFinite(config.mass, "mass");
		assertFinite(config.stiffness, "stiffness");
		assertFinite(config.damping, "damping");
		if (config.timestep !== void 0) assertFinite(config.timestep, "timestep");
		if (config.mass <= 0) throw new Error("SpringSolver requires a positive mass.");
		if (config.stiffness < 0) throw new Error("SpringSolver requires stiffness to be greater than or equal to zero.");
		if (config.damping < 0) throw new Error("SpringSolver requires damping to be greater than or equal to zero.");
		if (config.timestep === void 0 ? false : config.timestep <= 0) throw new Error("SpringSolver requires a positive timestep.");
		this.stiffness = config.stiffness;
		this.damping = config.damping;
		this.mass = config.mass;
		this.timestep = config.timestep ?? 1 / 120;
		this.velocityThreshold = config.velocityThreshold ?? .01;
		this.positionThreshold = config.positionThreshold ?? .01;
		this.value = initialValue;
		this.target = targetValue;
		this.velocity = initialVelocity;
	}
	getValue() {
		return this.value;
	}
	getTarget() {
		return this.target;
	}
	setTarget(targetValue) {
		assertFinite(targetValue, "targetValue");
		this.target = targetValue;
	}
	getVelocity() {
		return this.velocity;
	}
	setVelocity(velocity) {
		this.velocity = velocity;
	}
	advance(deltaTime) {
		if (deltaTime > 0) this.accumulator += deltaTime;
		while (this.accumulator >= this.timestep) {
			this.integrateStep();
			this.accumulator -= this.timestep;
		}
		return this.snapshot();
	}
	isSettled() {
		return Math.abs(this.velocity) < this.velocityThreshold && Math.abs(this.target - this.value) < this.positionThreshold;
	}
	snapshot() {
		return {
			value: this.value,
			target: this.target,
			velocity: this.velocity,
			settled: this.isSettled()
		};
	}
	integrateStep() {
		const displacement = this.value - this.target;
		const acceleration = (-this.stiffness * displacement - this.damping * this.velocity) / this.mass;
		this.velocity += acceleration * this.timestep;
		this.value += this.velocity * this.timestep;
	}
};
//#endregion
//#region dist/core/raf-driver.js
function createRafSpringDriver(options, scheduler) {
	const maxDeltaTime = options.maxDeltaTime ?? .25;
	if (!Number.isFinite(maxDeltaTime)) throw new Error("createRafSpringDriver requires maxDeltaTime to be finite.");
	if (maxDeltaTime <= 0) throw new Error("createRafSpringDriver requires maxDeltaTime to be positive.");
	const solver = new SpringSolver(options.initialValue, options.targetValue, options, options.initialVelocity ?? 0);
	const requestFrame = scheduler?.requestAnimationFrame ?? globalThis.requestAnimationFrame?.bind(globalThis);
	const cancelFrame = scheduler?.cancelAnimationFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis);
	if (!requestFrame || !cancelFrame) throw new Error("createRafSpringDriver requires requestAnimationFrame support.");
	const listeners = /* @__PURE__ */ new Set();
	let frameHandle = null;
	let running = false;
	let previousTimestamp = null;
	const emit = () => {
		const snapshot = solver.snapshot();
		for (const listener of listeners) listener(snapshot);
	};
	const stop = () => {
		if (frameHandle !== null) {
			cancelFrame(frameHandle);
			frameHandle = null;
		}
		running = false;
		previousTimestamp = null;
	};
	const tick = (timestamp) => {
		if (!running) return;
		frameHandle = null;
		if (previousTimestamp === null) previousTimestamp = timestamp;
		else {
			const deltaTimeSeconds = Math.min(maxDeltaTime, Math.max(0, (timestamp - previousTimestamp) / 1e3));
			previousTimestamp = timestamp;
			solver.advance(deltaTimeSeconds);
		}
		emit();
		if (solver.isSettled()) {
			stop();
			return;
		}
		frameHandle = requestFrame(tick);
	};
	return {
		start() {
			if (running) return;
			running = true;
			previousTimestamp = null;
			if (solver.isSettled()) {
				emit();
				running = false;
				return;
			}
			frameHandle = requestFrame(tick);
		},
		stop,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setTarget(targetValue) {
			solver.setTarget(targetValue);
			if (!running) emit();
		},
		getSnapshot() {
			return solver.snapshot();
		},
		isRunning() {
			return running;
		}
	};
}
//#endregion
//#region dist/tokens/springs.js
var SPRING_SNAPPY = {
	stiffness: 400,
	damping: 30,
	mass: .8
};
//#endregion
//#region dist/a11y/reducedMotion.js
var REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function getReducedMotionMediaQueryList() {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
	return window.matchMedia(REDUCED_MOTION_QUERY);
}
function getReducedMotionPreference() {
	return getReducedMotionMediaQueryList()?.matches ?? false;
}
//#endregion
//#region dist/react/useSpring.js
var SPRING_PROGRESS_PROPERTY = "--spring-progress";
function useSpring(targetValue, config, initialValue, onSettled) {
	const elementRef = useRef(null);
	const driverRef = useRef(null);
	const onSettledRef = useRef(onSettled);
	const hasAnimatedRef = useRef(false);
	const hasReportedSettledRef = useRef(false);
	const reducedMotionNotificationTokenRef = useRef(0);
	const reducedMotionAppliedTargetRef = useRef(null);
	const resolvedInitialValue = initialValue ?? 0;
	const configKey = [
		config.stiffness,
		config.damping,
		config.mass,
		config.timestep ?? "",
		config.velocityThreshold ?? "",
		config.positionThreshold ?? ""
	].join(":");
	onSettledRef.current = onSettled;
	const scheduleReducedMotionSettled = () => {
		reducedMotionNotificationTokenRef.current += 1;
		const token = reducedMotionNotificationTokenRef.current;
		queueMicrotask(() => {
			if (reducedMotionNotificationTokenRef.current !== token) return;
			onSettledRef.current?.();
		});
	};
	useEffect(() => {
		const element = elementRef.current;
		if (element) element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(resolvedInitialValue));
		hasAnimatedRef.current = false;
		hasReportedSettledRef.current = false;
		if (getReducedMotionPreference()) {
			if (element) element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(targetValue));
			driverRef.current = null;
			reducedMotionAppliedTargetRef.current = targetValue;
			scheduleReducedMotionSettled();
			return () => {
				reducedMotionNotificationTokenRef.current += 1;
				reducedMotionAppliedTargetRef.current = null;
			};
		}
		reducedMotionAppliedTargetRef.current = null;
		const driver = createRafSpringDriver({
			initialValue: resolvedInitialValue,
			targetValue,
			...config
		});
		driverRef.current = driver;
		const unsubscribe = driver.subscribe((snapshot) => {
			const element = elementRef.current;
			if (!element) return;
			const renderedValue = snapshot.settled ? snapshot.target : snapshot.value;
			element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(renderedValue));
			if (snapshot.settled) {
				if (hasAnimatedRef.current && !hasReportedSettledRef.current) {
					hasReportedSettledRef.current = true;
					onSettledRef.current?.();
				}
				return;
			}
			hasAnimatedRef.current = true;
			hasReportedSettledRef.current = false;
		});
		driver.start();
		return () => {
			reducedMotionNotificationTokenRef.current += 1;
			unsubscribe();
			driver.stop();
			if (driverRef.current === driver) driverRef.current = null;
		};
	}, [configKey]);
	useEffect(() => {
		const driver = driverRef.current;
		if (!driver) {
			if (getReducedMotionPreference()) {
				if (reducedMotionAppliedTargetRef.current === targetValue) return;
				const element = elementRef.current;
				if (element) element.style.setProperty(SPRING_PROGRESS_PROPERTY, String(targetValue));
				reducedMotionAppliedTargetRef.current = targetValue;
				scheduleReducedMotionSettled();
			}
			return;
		}
		driver.setTarget(targetValue);
		if (!driver.isRunning() && !driver.getSnapshot().settled) driver.start();
	}, [targetValue]);
	return elementRef;
}
//#endregion
//#region dist/variants/pressable.js
var PRESSABLE_CLASS_NAME = "bylgja-pressable";
function joinClassNames(...classNames) {
	return classNames.filter(Boolean).join(" ");
}
function usePressable({ className, onSettled, springConfig = SPRING_SNAPPY } = {}) {
	const [isPressed, setIsPressed] = useState(false);
	const ref = useSpring(isPressed ? 1 : 0, springConfig, 0, onSettled);
	const press = () => {
		setIsPressed(true);
	};
	const release = () => {
		setIsPressed(false);
	};
	useEffect(() => {
		if (!isPressed) return;
		const handleWindowMouseUp = () => {
			release();
		};
		window.addEventListener("mouseup", handleWindowMouseUp);
		return () => {
			window.removeEventListener("mouseup", handleWindowMouseUp);
		};
	}, [isPressed]);
	return {
		className: joinClassNames(PRESSABLE_CLASS_NAME, className),
		onMouseDown: () => {
			press();
		},
		onMouseUp: () => {
			release();
		},
		onPointerCancel: () => {
			release();
		},
		onPointerDown: (event) => {
			press();
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		onPointerUp: () => {
			release();
		},
		ref
	};
}
//#endregion
//#region tree-shake-check/src/pressable-only.tsx
function PressableOnlyExample() {
	return createElement("button", {
		...usePressable(),
		type: "button"
	}, "Pressable only");
}
//#endregion
export { PressableOnlyExample };

//# sourceMappingURL=pressable-only.inspect.js.map