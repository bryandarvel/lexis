import { useRef } from 'react'

import { gsap, useGSAP } from '../animations/gsap.js'

export default function useGsapHeroIntro() {
	const containerRef = useRef(null)

	useGSAP(
		() => {
			const media = gsap.matchMedia()

			media.add(
				'(prefers-reduced-motion: no-preference)',
				() => {
					const timeline = gsap.timeline({
						defaults: {
							duration: 0.65,
							ease: 'power3.out',
						},
					})

					timeline
						.from('[data-hero-backdrop]', {
							opacity: 0,
							scale: 1.03,
							duration: 0.8,
						})
						.from(
							'[data-hero-reveal]',
							{
								opacity: 0,
								y: 28,
								stagger: 0.09,
							},
							'-=0.45',
						)
				},
			)

			return () => media.revert()
		},
		{
			scope: containerRef,
		},
	)

	return containerRef
}
