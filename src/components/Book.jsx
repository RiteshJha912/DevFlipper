import { useCursor, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useAtom } from 'jotai'
import { easing } from 'maath'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from 'three'
import { degToRad } from 'three/src/math/MathUtils.js'
import { pageAtom, pages } from './UI'

// setting factors for the page flipping animation
const easingFactor = 0.5 // how smooth the page flips
const easingFactorFold = 0.3 // how smooth the page fold appears
const insideCurveStrength = 0.18 // how much the page curves on the inside
const outsideCurveStrength = 0.05 // how much the page curves on the outside
const turningCurveStrength = 0.09 // how much the page bends while turning

// page dimensions and geometry setup
const PAGE_WIDTH = 1.28
const PAGE_HEIGHT = 1.71 // keeping the aspect ratio 4:3
const PAGE_DEPTH = 0.003
const PAGE_SEGMENTS = 30 // number of segments on each page for flexibility during animation
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
)

// translating the geometry so the pivot is at the correct place
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0)

const position = pageGeometry.attributes.position
const vertex = new Vector3()
const skinIndexes = []
const skinWeights = []

for (let i = 0; i < position.count; i++) {
  // grabbing each vertex and setting up skinning (bones influence the vertex movement)
  vertex.fromBufferAttribute(position, i)
  const x = vertex.x

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)) // calculating which bone influences this vertex
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH // determining the weight/influence

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0)
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0)
}

// adding skin attributes to the geometry for bone animation
pageGeometry.setAttribute(
  'skinIndex',
  new Uint16BufferAttribute(skinIndexes, 4)
)
pageGeometry.setAttribute(
  'skinWeight',
  new Float32BufferAttribute(skinWeights, 4)
)

// setting up page materials (front and back) and color properties
const whiteColor = new Color('#a6a39a')
const emissiveColor = new Color('orange')

const pageMaterials = [
  new MeshStandardMaterial({
    color: '#a6a39a',
  }),
  new MeshStandardMaterial({
    color: '#a6a39a',
  }),
  new MeshStandardMaterial({
    color: '#a6a39a',
  }),
  new MeshStandardMaterial({
    color: '#a6a39a',
  }),
]

// preloading textures for all pages
pages.forEach((page) => {
  useTexture.preload(`/textures/${page.front}.jpg`)
  useTexture.preload(`/textures/${page.back}.jpg`)
  useTexture.preload(`/textures/book-cover-roughness.jpg`)
})

const Page = ({ number, front, back, page, opened, bookClosed, ...props }) => {
  // load the page textures and roughness map if needed
  const [picture, picture2, pictureRoughness] = useTexture([
    `/textures/${front}.jpg`,
    `/textures/${back}.jpg`,
    ...(number === 0 || number === pages.length - 1
      ? [`/textures/book-cover-roughness.jpg`]
      : []),
  ])

  // making sure the color space is right for the textures
  picture.colorSpace = picture2.colorSpace = SRGBColorSpace

  const group = useRef()
  const turnedAt = useRef(0) // store the time when a page starts turning
  const lastOpened = useRef(opened) // track whether the page is open or not

  const skinnedMeshRef = useRef()

  // setting up bones and skeletons to animate the pages
  const manualSkinnedMesh = useMemo(() => {
    const bones = []
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone()
      bones.push(bone)
      if (i === 0) {
        bone.position.x = 0
      } else {
        bone.position.x = SEGMENT_WIDTH
      }
      if (i > 0) {
        bones[i - 1].add(bone) // attaching bones together to create a chain
      }
    }
    const skeleton = new Skeleton(bones)

    // setting up materials for both front and back of the page
    const materials = [
      ...pageMaterials,
      new MeshStandardMaterial({
        color: '#a6a39a',
        map: picture,
        ...(number === 0
          ? {
              roughnessMap: pictureRoughness,
            }
          : {
              roughness: 0.1,
            }),
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshStandardMaterial({
        color: '#a6a39a',
        map: picture2,
        ...(number === pages.length - 1
          ? {
              roughnessMap: pictureRoughness,
            }
          : {
              roughness: 0.1,
            }),
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ]

    // creating the skinned mesh that will be animated by the bones
    const mesh = new SkinnedMesh(pageGeometry, materials)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    mesh.add(skeleton.bones[0])
    mesh.bind(skeleton)
    return mesh
  }, [])

  // animate the page flipping and page curves based on user input
  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return
    }

    // highlight the page if it's being hovered
    const emissiveIntensity = highlighted ? 0.22 : 0
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1
      )

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date() // record the time when the page starts turning
      lastOpened.current = opened // update whether it's open or closed
    }

    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400
    turningTime = Math.sin(turningTime * Math.PI) // smoothing the animation timing

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2 // set target rotation based on whether the page is open or closed
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8) // add a slight rotation if the book is not closed
    }

    const bones = skinnedMeshRef.current.skeleton.bones
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i] // setting the target for rotation

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0 // stronger curve for inside pages
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0 // softer curve for outside pages
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime // influence of turning time

      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2)

      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation // handle the rotation of the first bone
          foldRotationAngle = 0
        } else {
          rotationAngle = 0
          foldRotationAngle = 0
        }
      }

      // applying smooth angle transitions to the bones
      easing.dampAngle(target.rotation, 'y', rotationAngle, easingFactor, delta)

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0

      // applying fold effect during page turn
      easing.dampAngle(
        target.rotation,
        'x',
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta
      )
    }
  })

  // This line sets up the state to manage which page is highlighted
  const [_, setPage] = useAtom(pageAtom)
  const [highlighted, setHighlighted] = useState(false) // state to check if the page is highlighted
  useCursor(highlighted) // shows a different cursor when hovering over the page

  return (
    <group
      {...props}
      ref={group} // use the group ref for positioning and animations
      // Event listener for when the mouse pointer enters the page
      onPointerEnter={(e) => {
        e.stopPropagation() // prevent the event from affecting other objects
        setHighlighted(true) // mark the page as highlighted
      }}
      // Event listener for when the mouse pointer leaves the page
      onPointerLeave={(e) => {
        e.stopPropagation()
        setHighlighted(false) // unmark the page when the cursor leaves
      }}
      // Event listener for when the page is clicked
      onClick={(e) => {
        e.stopPropagation()
        setPage(opened ? number : number + 1) // flip to the next page or close the current one
        setHighlighted(false) // reset the highlight
      }}
    >
      {/* The page object (manualSkinnedMesh) is placed and animated here */}
      <primitive
        object={manualSkinnedMesh} // attach the manualSkinnedMesh (the page itself)
        ref={skinnedMeshRef} // ref for accessing the page mesh
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH} // z position changes based on page number
      />
    </group>
  )
}

// The main Book component that contains all pages
export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom) // get the current page from state
  const [delayedPage, setDelayedPage] = useState(page) // add a delay to smooth out page transitions

  // This effect is responsible for gradually flipping pages with a delay
  useEffect(() => {
    let timeout
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        // if the delayed page matches the current page, no further action is needed
        if (page === delayedPage) {
          return delayedPage
        } else {
          // otherwise, set a timeout to slowly move to the next or previous page
          timeout = setTimeout(
            () => {
              goToPage() // recursively call the function to keep flipping
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150 // smaller timeouts for closer pages
          )
          // move forward or backward one page at a time
          if (page > delayedPage) {
            return delayedPage + 1
          }
          if (page < delayedPage) {
            return delayedPage - 1
          }
        }
      })
    }
    goToPage() // start flipping to the target page
    return () => {
      clearTimeout(timeout) // clear the timeout when the effect is cleaned up
    }
  }, [page]) // run the effect when the page changes

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {/* Map through all the pages and render them */}
      {[...pages].map((pageData, index) => (
        <Page
          key={index}
          page={delayedPage} // current page with delay
          number={index} // page number
          opened={delayedPage > index} // check if the page is open or not
          bookClosed={delayedPage === 0 || delayedPage === pages.length} // check if the book is closed
          {...pageData} // pass the page data (like front and back textures)
        />
      ))}
    </group>
  )
}
