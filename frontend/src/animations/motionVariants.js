const smoothEase = [0.22, 1, 0.36, 1]

export const pageVariants = {
	hidden: {
		opacity: 0,
		y: 12.
},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.2,
			ease: smoothEase,
		},
	},
	exit: {
		opacity: 0,
		y: -8,
		transition: {
			duration: 0.2,
			ease: smoothEase,
		},
	},
}

export const listVariants = {
	hidden: {},
	visible: {
		transition: {
		staggerChildren: 0.07,
		delayChildren: 0.08,
		},
	},
}


export const listItemVariants = {
	hidden: {
		opacity: 0,
		y: 18,
	},
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.4,
			ease: smoothEase,
		},
	},
}

export const cardVariants = {
	rest: {
		y: 0,
		scale: 1,
	},
	hover: {
		y: -8,
		scale: 1.035,
		transition: {
			type: 'spring',
			stiffness: 340,
			damping: 26,
		},
	},
	tap: {
		scale: 0.98,
	},
}