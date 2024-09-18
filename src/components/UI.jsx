import { atom, useAtom } from 'jotai'
import { useEffect } from 'react'

// List of image file names for the flipbook pages
const pictures = [
  'DSC00680',
  'DSC00933',
  'DSC00966',
  'DSC00983',
  'DSC01011',
  'DSC01040',
  'DSC01064',
  'DSC01071',
  'DSC01103',
  'DSC01145',
  'DSC01420',
  'DSC01461',
  'DSC01489',
  'DSC02031',
  'DSC02064',
  'DSC02069',
]

export const pageAtom = atom(0) // Atom to manage current page state
export const pages = [
  {
    front: 'book-cover', // Cover page
    back: pictures[0],
  },
]

// Generate front and back for each page in pairs
for (let i = 1; i < pictures.length - 1; i += 2) {
  pages.push({
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  })
}

// Add the back cover of the book
pages.push({
  front: pictures[pictures.length - 1],
  back: 'book-back',
})

// UI component for rendering the book navigation
export const UI = () => {
  const [page, setPage] = useAtom(pageAtom)

  // Play page-flipping sound on page change
  useEffect(() => {
    const audio = new Audio('/audios/page-flip-01a.mp3')
    audio.play()
  }, [page])

  return (
    <>
      {/* Main navigation layout with logo */}
      <main className='pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col'>
        <a
          className='pointer-events-auto mt-10 ml-10'
          href='https://about-ritesh.netlify.app/'
        >
          <img className='w-20' src='/images/RJLogo.png' />
        </a>
        <div className='w-full overflow-auto pointer-events-auto flex justify-center'>
          <div className='overflow-auto flex items-center gap-4 max-w-full p-10'>
            {/* Navigation buttons for each page */}
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                  index === page
                    ? 'bg-white/90 text-black'
                    : 'bg-black/30 text-white'
                }`}
                onClick={() => setPage(index)}
              >
                {index === 0 ? 'Cover' : `Page ${index}`}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300 px-4 py-3 rounded-full text-lg uppercase shrink-0 border ${
                page === pages.length
                  ? 'bg-white/90 text-black'
                  : 'bg-black/30 text-white'
              }`}
              onClick={() => setPage(pages.length)}
            >
              Back Cover
            </button>
          </div>
        </div>
      </main>

      {/* Animated text and visual effects */}
      <div className='fixed inset-0 flex items-center -rotate-2 select-none'>
        <div className='relative'>
          <div className='bg-white/0 animate-horizontal-scroll flex items-center gap-8 w-max px-8'>
            <h1 className='shrink-0 text-white text-10xl font-black '>
              Ritesh
            </h1>
            <h2 className='shrink-0 text-white text-8xl italic font-light'>
              Developer
            </h2>
            <h2 className='shrink-0 text-white text-12xl font-bold'>Coder</h2>
            <h2 className='shrink-0 text-transparent text-12xl font-bold italic outline-text'>
              Security-enthusiast
            </h2>
            <h2 className='shrink-0 text-white text-9xl font-medium'>OSINT</h2>
            <h2 className='shrink-0 text-white text-9xl font-extralight italic'>
              MERN
            </h2>
            <h2 className='shrink-0 text-white text-13xl font-bold'>
              Designing
            </h2>
            <h2 className='shrink-0 text-transparent text-13xl font-bold outline-text italic'>
              Hazardous
            </h2>
          </div>

          {/* Second row of text animations */}
          <div className='absolute top-0 left-0 bg-white/0 animate-horizontal-scroll-2 flex items-center gap-8 px-8 w-max'>
            <h1 className='shrink-0 text-white text-10xl font-black '>
              Ritesh
            </h1>
            <h2 className='shrink-0 text-white text-8xl italic font-light'>
              Developer
            </h2>
            <h2 className='shrink-0 text-white text-12xl font-bold'>Coder</h2>
            <h2 className='shrink-0 text-transparent text-12xl font-bold italic outline-text'>
              Security-enthusiast
            </h2>
            <h2 className='shrink-0 text-white text-9xl font-medium'>OSINT</h2>
            <h2 className='shrink-0 text-white text-9xl font-extralight italic'>
              MERN
            </h2>
            <h2 className='shrink-0 text-white text-13xl font-bold'>
              Designing
            </h2>
            <h2 className='shrink-0 text-transparent text-13xl font-bold outline-text italic'>
              Hazardous
            </h2>
          </div>
        </div>
      </div>
    </>
  )
}
